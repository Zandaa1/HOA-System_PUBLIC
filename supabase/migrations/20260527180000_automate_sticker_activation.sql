-- Migration: Automate Car Sticker Activation & Expiration

-- 1. Add columns to vehicles table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS sticker_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sticker_expires_at timestamp with time zone;

-- 2. Trigger function to sync vehicle activation when an invoice is paid or unpaid
CREATE OR REPLACE FUNCTION public.sync_vehicle_activation_on_invoice_payment()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE public.vehicles
    SET is_active = true,
        sticker_expires_at = COALESCE(
          (SELECT payment_date FROM public.payments WHERE invoice_id = NEW.id ORDER BY payment_date DESC LIMIT 1) + INTERVAL '1 year',
          now() + INTERVAL '1 year'
        )
    WHERE sticker_invoice_id = NEW.id;
  ELSIF NEW.status IS DISTINCT FROM 'paid' AND OLD.status = 'paid' THEN
    UPDATE public.vehicles
    SET is_active = false,
        sticker_expires_at = NULL
    WHERE sticker_invoice_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on invoices
DROP TRIGGER IF EXISTS sync_vehicle_activation_trigger ON public.invoices;
CREATE TRIGGER sync_vehicle_activation_trigger
AFTER UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_activation_on_invoice_payment();

-- 3. Trigger function on vehicles to prevent manual activation bypass when linked to an invoice
CREATE OR REPLACE FUNCTION public.check_vehicle_initial_activation()
RETURNS trigger AS $$
DECLARE
  inv_status text;
  inv_payment_date timestamp with time zone;
BEGIN
  IF NEW.sticker_invoice_id IS NOT NULL THEN
    -- Get the linked invoice status
    SELECT status INTO inv_status FROM public.invoices WHERE id = NEW.sticker_invoice_id;
    
    IF inv_status = 'paid' THEN
      -- If invoice is paid, force active state
      NEW.is_active := true;
      -- Set expiration if not already set
      IF NEW.sticker_expires_at IS NULL THEN
        SELECT payment_date INTO inv_payment_date 
        FROM public.payments 
        WHERE invoice_id = NEW.sticker_invoice_id 
        ORDER BY payment_date DESC LIMIT 1;
        
        IF inv_payment_date IS NOT NULL THEN
          NEW.sticker_expires_at := inv_payment_date + INTERVAL '1 year';
        ELSE
          NEW.sticker_expires_at := now() + INTERVAL '1 year';
        END IF;
      END IF;
    ELSE
      -- If invoice is not paid, force inactive state
      NEW.is_active := false;
      NEW.sticker_expires_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on vehicles
DROP TRIGGER IF EXISTS check_vehicle_activation_trigger ON public.vehicles;
CREATE TRIGGER check_vehicle_activation_trigger
BEFORE INSERT OR UPDATE OF sticker_invoice_id, is_active, sticker_expires_at ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.check_vehicle_initial_activation();
