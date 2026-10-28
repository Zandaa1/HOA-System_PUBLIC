export interface Staff {
  id: string
  user_id: string | null
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  position: string | null
  permissions: Record<string, boolean>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  permissions: Record<string, boolean>
  is_system_role: boolean
  created_at: string
}

export interface StaffRole {
  id: string
  staff_id: string
  role_id: string
  assigned_at: string
}

export interface PropertyType {
  id: string
  name: string
  description: string | null
  default_monthly_dues: number
  color: string
  created_at: string
}

export interface Property {
  id: string
  block: string
  lot: string
  phase: string | null
  street_address: string | null
  property_type_id: string | null
  lot_area_sqm: number | null
  floor_area_sqm: number | null
  latitude: number | null
  longitude: number | null
  photo_url: string | null
  status: 'occupied' | 'vacant' | 'for_sale' | 'for_rent'
  monthly_dues_override: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  property_type?: PropertyType
  homeowners?: Homeowner[]
  renters?: Renter[]
  vehicles?: Vehicle[]
}

export interface Homeowner {
  id: string
  property_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  email: string | null
  phone: string | null
  secondary_phone: string | null
  is_residing: boolean
  move_in_date: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  property?: Property
}

export interface Renter {
  id: string
  property_id: string
  first_name: string
  last_name: string
  middle_name: string | null
  email: string | null
  phone: string | null
  lease_start: string | null
  lease_end: string | null
  monthly_rent: number | null
  security_deposit: number | null
  is_active: boolean
  photo_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  property?: Property
}

export interface Vehicle {
  id: string
  property_id: string
  owner_type: 'homeowner' | 'renter' | null
  owner_id: string | null
  plate_number: string
  vehicle_type: 'car' | 'motorcycle' | 'suv' | 'van' | 'truck' | 'other' | null
  brand: string | null
  model: string | null
  color: string | null
  sticker_number: string | null
  is_active: boolean
  sticker_invoice_id: string | null
  sticker_expires_at: string | null
  created_at: string
  // Joined
  property?: Property
  sticker_invoice?: Invoice
}

export interface BillingPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  due_date: string
  is_closed: boolean
  created_at: string
}

export interface FeeType {
  id: string
  name: string
  description: string | null
  default_amount: number
  recurrence: 'monthly' | 'yearly' | 'one_time'
  is_active: boolean
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  property_id: string
  billing_period_id: string | null
  issue_date: string
  due_date: string
  subtotal: number
  discount_amount: number
  penalty_amount: number
  total_amount: number
  amount_paid: number
  balance: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  property?: Property
  billing_period?: BillingPeriod
  invoice_items?: InvoiceItem[]
  payments?: Payment[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  fee_type_id: string | null
  description: string
  quantity: number
  unit_price: number
  amount: number
  created_at: string
  // Joined
  fee_type?: FeeType
}

export interface Payment {
  id: string
  invoice_id: string
  payment_number: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'gcash' | 'maya' | 'other' | null
  reference_number: string | null
  received_by: string | null
  notes: string | null
  bank_account_id: string
  attachment_url: string | null
  created_at: string
  // Joined
  invoice?: Invoice
  staff?: Staff
  bank_account?: BankAccount
}

export interface Penalty {
  id: string
  invoice_id: string
  penalty_type: 'late_fee' | 'interest' | 'other' | null
  amount: number
  applied_date: string
  description: string | null
  created_at: string
}

export interface Discount {
  id: string
  name: string
  description: string | null
  discount_type: 'percentage' | 'fixed' | null
  value: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export interface AdvanceDeposit {
  id: string
  property_id: string
  amount: number
  deposit_date: string
  payment_method: string | null
  reference_number: string | null
  remaining_balance: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Amenity {
  id: string
  name: string
  description: string | null
  location: string | null
  capacity: number | null
  hourly_rate: number
  half_day_rate: number
  full_day_rate: number
  requires_deposit: boolean
  deposit_amount: number
  rules: string | null
  is_active: boolean
  latitude: number | null
  longitude: number | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface AmenitySchedule {
  id: string
  amenity_id: string
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_available: boolean
  created_at: string
}

export interface AmenityBooking {
  id: string
  amenity_id: string
  property_id: string
  booked_by_name: string
  booking_date: string
  start_time: string
  end_time: string
  duration_type: 'hourly' | 'half_day' | 'full_day' | null
  num_guests: number
  purpose: string | null
  total_amount: number
  deposit_paid: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  amenity?: Amenity
  property?: Property
}

export interface WaterMeter {
  id: string
  property_id: string
  meter_number: string
  installation_date: string | null
  last_reading_date: string | null
  last_reading_value: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  property?: Property
}

export interface WaterReading {
  id: string
  meter_id: string
  reading_date: string
  previous_reading: number
  current_reading: number
  consumption: number
  read_by: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
  // Joined
  meter?: WaterMeter
  staff?: Staff
}

export interface WaterRate {
  id: string
  name: string
  min_consumption: number
  max_consumption: number | null
  rate_per_cubic_meter: number
  effective_from: string
  effective_until: string | null
  is_active: boolean
  created_at: string
}

export interface WaterBill {
  id: string
  reading_id: string
  property_id: string
  billing_period: string | null
  consumption: number
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  invoice_id: string | null
  created_at: string
}

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: string | null
  setting_type: 'string' | 'number' | 'boolean' | 'json' | null
  description: string | null
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  staff_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface CustomFieldDefinition {
  id: string
  entity_type: 'property' | 'homeowner' | 'renter' | 'vehicle'
  field_name: string
  field_label: string
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  options: string[] | null
  is_required: boolean
  display_order: number
  created_at: string
}

export interface CustomFieldValue {
  id: string
  definition_id: string
  entity_id: string
  value: string | null
  created_at: string
  updated_at: string
}

export interface ViolationCategory {
  id: string
  name: string
  description: string | null
  fine_amount: number
  created_at: string
}

export interface Violation {
  id: string
  property_id: string
  category_id: string | null
  title: string
  description: string | null
  status: 'warning_issued' | 'fine_issued' | 'resolved' | 'appealed' | 'cancelled'
  incident_date: string
  photo_urls: string[]
  fine_applied: number
  portal_alert_dismissed: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // relations
  property?: Property
  category?: ViolationCategory
}

export interface ViolationLog {
  id: string
  violation_id: string
  action: string
  performed_by: string | null
  details: string | null
  created_at: string
  // relations
  violation?: Violation
}

export interface MaintenanceVendor {
  id: string
  name: string
  specialty: string
  contact_person: string | null
  phone: string | null
  email: string | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  property_id: string
  title: string
  description: string
  category: 'plumbing' | 'electrical' | 'carpentry' | 'landscaping' | 'other'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'emergency'
  photo_urls: string[]
  assigned_vendor_id: string | null
  estimated_cost: number | null
  actual_cost: number | null
  scheduled_date: string | null
  completion_date: string | null
  created_at: string
  updated_at: string
  // relations
  property?: Property
  vendor?: MaintenanceVendor
}

export interface BankAccount {
  id: string
  name: string
  account_number: string | null
  bank_name: string | null
  type: 'current' | 'savings' | 'money_market' | 'petty_cash'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BankBalance {
  id: string
  bank_account_id: string
  period_month: number
  period_year: number
  beginning_balance: number
  ending_balance: number
  created_at: string
  updated_at: string
  // joined
  bank_account?: BankAccount
}

export interface Disbursement {
  id: string
  disbursement_number: string | null
  category: 'utility' | 'salary' | 'repairs' | 'security' | 'supplies' | 'legal' | 'refund_bond' | 'transfer' | 'others'
  amount: number
  payment_date: string
  payment_method: string
  bank_account_id: string
  payee: string
  check_no: string | null
  prepared_by: string | null
  period_month: number
  period_year: number
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  cash_advance_id: string | null
  is_advance_release: boolean
  is_fund_transfer: boolean
  // joined
  bank_account?: BankAccount
}

export interface NonInvoiceCollection {
  id: string
  receipt_number: string | null
  category: string
  amount: number
  payment_date: string
  payment_method: string
  bank_account_id: string
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  bank_account?: BankAccount
}

export interface AccountTransfer {
  id: string
  transfer_number: string | null
  source_bank_account_id: string
  destination_bank_account_id: string
  amount: number
  transfer_date: string
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  source_bank_account?: BankAccount
  destination_bank_account?: BankAccount
}

export interface CashAdvance {
  id: string
  reference_number: string
  advance_type: 'staff' | 'pcf'
  grantee_name: string
  grantee_role: string | null
  purpose: string
  requested_amount: number
  approved_amount: number | null
  released_amount: number
  liquidated_amount: number
  returned_amount: number
  outstanding_balance: number
  status: 'draft' | 'pending_approval' | 'approved' | 'released' | 'partially_liquidated' | 'liquidated' | 'cancelled'
  source_bank_account_id: string | null
  release_disbursement_id: string | null
  requested_at: string
  approved_at: string | null
  released_at: string | null
  due_liquidation_date: string | null
  closed_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  source_bank_account?: BankAccount
  release_disbursement?: Disbursement
}

export interface AdvanceLiquidation {
  id: string
  cash_advance_id: string
  amount: number
  description: string
  category: 'utility' | 'transportation_equipment' | 'salary' | 'representation' | 'repairs' | 'refund_bond' | 'supplies' | 'legal' | 'security' | 'others'
  receipt_date: string
  receipt_number: string | null
  attachment_url: string | null
  disbursement_id: string | null
  submitted_at: string
  created_at: string
  // Joined
  cash_advance?: CashAdvance
  disbursement?: Disbursement
}

export interface AdvanceReturn {
  id: string
  cash_advance_id: string
  amount: number
  return_method: 'cash' | 'bank_transfer' | 'gcash' | null
  reference_number: string | null
  returned_at: string
  received_by: string | null
  notes: string | null
  created_at: string
}

export interface PCFReplenishment {
  id: string
  pcf_bank_account_id: string
  source_bank_account_id: string
  requested_amount: number
  approved_amount: number | null
  status: 'pending' | 'approved' | 'released' | 'rejected'
  disbursement_id: string | null
  requested_at: string
  approved_at: string | null
  released_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  // Joined
  pcf_bank_account?: BankAccount
  source_bank_account?: BankAccount
  disbursement?: Disbursement
}

export interface MapBoundary {
  id: string
  name: string
  geometry: number[][][]  // GeoJSON polygon coordinates: [[[lng, lat], ...]]
  created_at: string
  updated_at: string
}
