import assert from 'node:assert/strict'

import {
  getFileUrl,
  getDisplayFileUrl,
  getDocumentStoredPath,
  isStaffOnlyFilePath,
  normalizeStoredPath,
  sanitizeFileName,
} from '@/lib/storage/shared'
import { resolveLocalFilePath } from '@/lib/storage/server'

process.env.LOCAL_UPLOAD_ROOT = '/tmp/hoa_demo-uploads'

assert.equal(sanitizeFileName('Receipt #123.PNG'), 'receipt-123.png')
assert.equal(sanitizeFileName('  HOA Guidelines 2026.pdf  '), 'hoa-guidelines-2026.pdf')

assert.equal(
  getFileUrl('payments/2026/06/receipt-123.png'),
  '/api/files?path=payments%2F2026%2F06%2Freceipt-123.png',
)
assert.equal(
  getFileUrl('http://127.0.0.1:54321/storage/v1/object/public/attachments/properties/a.jpg'),
  '/api/files?path=properties%2Fa.jpg',
)
assert.equal(getDisplayFileUrl('/placeholder-logo.svg'), '/placeholder-logo.svg')
assert.equal(getDocumentStoredPath('community/rules.pdf'), 'documents/community/rules.pdf')

assert.equal(normalizeStoredPath('/documents/community/rules.pdf'), 'documents/community/rules.pdf')
assert.throws(() => normalizeStoredPath('../secrets.env'), /Invalid file path/)
assert.throws(() => normalizeStoredPath('documents/../../secrets.env'), /Invalid file path/)

assert.equal(resolveLocalFilePath('documents/community/rules.pdf'), '/tmp/hoa_demo-uploads/documents/community/rules.pdf')
assert.throws(() => resolveLocalFilePath('../secrets.env'), /Invalid file path/)

assert.equal(isStaffOnlyFilePath('payments/2026/06/receipt.png'), true)
assert.equal(isStaffOnlyFilePath('liquidations/receipt.png'), true)
assert.equal(isStaffOnlyFilePath('documents/community/rules.pdf'), false)
