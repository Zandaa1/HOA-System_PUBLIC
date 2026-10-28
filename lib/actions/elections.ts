'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBallotAction(formData: {
  title: string
  description?: string
  start_date: string
  end_date: string
  options: string[]
}) {
  const supabase = await createClient()

  // 1. Insert the Ballot
  const { data: ballot, error: ballotErr } = await supabase
    .from('ballots')
    .insert({
      title: formData.title,
      description: formData.description || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_active: true,
    })
    .select('id')
    .single()

  if (ballotErr) {
    throw new Error(`Failed to create ballot: ${ballotErr.message}`)
  }

  // 2. Insert Ballot Options
  const optionRows = formData.options
    .filter((opt) => opt.trim() !== '')
    .map((opt) => ({
      ballot_id: ballot.id,
      option_text: opt.trim(),
    }))

  if (optionRows.length < 2) {
    // Cleanup ballot if options are invalid
    await supabase.from('ballots').delete().eq('id', ballot.id)
    throw new Error('A ballot must have at least 2 options.')
  }

  const { error: optionsErr } = await supabase.from('ballot_options').insert(optionRows)
  if (optionsErr) {
    await supabase.from('ballots').delete().eq('id', ballot.id)
    throw new Error(`Failed to create ballot options: ${optionsErr.message}`)
  }

  revalidatePath('/dashboard/elections')
  revalidatePath('/portal/voting')
  return { success: true, ballotId: ballot.id }
}

export async function castVoteAction(formData: {
  ballotId: string
  propertyId: string
  residentId: string
  residentType: 'homeowner' | 'renter'
  optionId: string
}) {
  const supabase = await createClient()

  // 1. Check if ballot is active and within dates
  const { data: ballot, error: ballotErr } = await supabase
    .from('ballots')
    .select('*')
    .eq('id', formData.ballotId)
    .single()

  if (ballotErr || !ballot) {
    throw new Error('Ballot not found.')
  }

  if (!ballot.is_active) {
    throw new Error('This ballot is no longer active.')
  }

  const now = new Date()
  const startDate = new Date(ballot.start_date)
  const endDate = new Date(ballot.end_date)

  if (now < startDate) {
    throw new Error('Voting for this ballot has not started yet.')
  }
  if (now > endDate) {
    throw new Error('Voting for this ballot has closed.')
  }

  // 2. Cast the vote
  const { error: voteErr } = await supabase
    .from('ballot_votes')
    .insert({
      ballot_id: formData.ballotId,
      property_id: formData.propertyId,
      voted_by_resident_id: formData.residentId,
      voted_by_resident_type: formData.residentType,
      option_id: formData.optionId,
    })

  if (voteErr) {
    if (voteErr.code === '23505') {
      throw new Error('This property has already cast a vote for this ballot.')
    }
    throw new Error(`Failed to cast vote: ${voteErr.message}`)
  }

  revalidatePath('/portal/voting')
  return { success: true }
}

export async function toggleBallotActiveAction(ballotId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ballots')
    .update({ is_active: isActive })
    .eq('id', ballotId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/elections')
  revalidatePath('/portal/voting')
  return { success: true }
}

export async function deleteBallotAction(ballotId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ballots')
    .delete()
    .eq('id', ballotId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/elections')
  revalidatePath('/portal/voting')
  return { success: true }
}
