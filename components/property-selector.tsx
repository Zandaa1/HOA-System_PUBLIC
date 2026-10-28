'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PropertySelectGroupProps {
  properties: { id: string; block: string; lot: string; phase?: string | null }[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  blockLabel?: string
  lotLabel?: string
  optional?: boolean
}

export function PropertySelectGroup({
  properties = [],
  value,
  onValueChange,
  disabled = false,
  required = false,
  blockLabel = 'Block',
  lotLabel = 'Lot',
  optional = false,
}: PropertySelectGroupProps) {
  // Sort blocks numerically if possible, otherwise alphabetically
  const uniqueBlocks = Array.from(new Set(properties.map((p) => p.block))).sort((a, b) => {
    const numA = parseInt(a, 10)
    const numB = parseInt(b, 10)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b)
  })

  const isInternalChange = useRef(false)
  const [localBlock, setLocalBlock] = useState('')
  const [prevValue, setPrevValue] = useState(value)

  // Sync state if value changes from outside
  if (value !== prevValue) {
    setPrevValue(value)
    if (!isInternalChange.current) {
      const prop = properties.find((p) => p.id === value)
      setLocalBlock(prop ? prop.block : '')
    }
    isInternalChange.current = false
  }

  // Find currently selected property
  const selectedProperty = properties.find((p) => p.id === value)
  const currentBlock = selectedProperty ? selectedProperty.block : localBlock

  // Filter lots in current block
  const lotsInBlock = currentBlock
    ? properties
        .filter((p) => p.block === currentBlock)
        .sort((a, b) => {
          const numA = parseInt(a.lot, 10)
          const numB = parseInt(b.lot, 10)
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }
          return a.lot.localeCompare(b.lot)
        })
    : []

  const handleBlockChange = (block: string) => {
    isInternalChange.current = true
    const newBlock = block === 'none' ? '' : block
    setLocalBlock(newBlock)
    onValueChange('')
  }

  const handleLotChange = (propertyId: string) => {
    isInternalChange.current = true
    onValueChange(propertyId === 'none' ? '' : propertyId)
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="property_block">
          {blockLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={currentBlock || (optional ? 'none' : '')}
          onValueChange={handleBlockChange}
          disabled={disabled}
        >
          <SelectTrigger id="property_block">
            <SelectValue placeholder="Select block" />
          </SelectTrigger>
          <SelectContent>
            {optional && <SelectItem value="none">None</SelectItem>}
            {uniqueBlocks.map((block) => (
              <SelectItem key={block} value={block}>
                Block {block}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="property_id">
          {lotLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={value || (optional ? 'none' : '')}
          onValueChange={handleLotChange}
          disabled={disabled || !currentBlock}
        >
          <SelectTrigger id="property_id">
            <SelectValue placeholder={currentBlock ? 'Select lot' : 'Select block first'} />
          </SelectTrigger>
          <SelectContent>
            {optional && <SelectItem value="none">None</SelectItem>}
            {lotsInBlock.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                Lot {p.lot} {p.phase ? `(Phase ${p.phase})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
