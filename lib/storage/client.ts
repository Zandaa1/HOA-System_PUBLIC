export async function uploadAppFile(
  file: File,
  options: { directory: string },
): Promise<{ path: string; size: number; type: string }> {
  const uploadFile = await prepareFileForUpload(file, options.directory)
  const formData = new FormData()
  formData.set('file', uploadFile)
  formData.set('directory', options.directory)

  const response = await fetch('/api/files', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to upload file')
  }

  return payload.file
}

export async function deleteAppFile(path: string | null | undefined): Promise<void> {
  if (!path) return

  const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Failed to delete file')
  }
}

async function prepareFileForUpload(file: File, directory: string): Promise<File> {
  if (
    typeof window === 'undefined' ||
    !file.type.startsWith('image/') ||
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif'
  ) {
    return file
  }

  const config = getImageCompressionConfig(directory)
  if (!config) return file

  try {
    const image = await loadImage(file)
    const scale = Math.min(1, config.maxDimension / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)
    URL.revokeObjectURL(image.src)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, config.type, config.quality)
    })

    if (!blob || blob.size >= file.size) return file

    return new File([blob], replaceExtension(file.name, config.extension), {
      type: config.type,
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

function getImageCompressionConfig(directory: string): { maxDimension: number; quality: number; type: string; extension: string } | null {
  if (directory.startsWith('properties') || directory.startsWith('amenities')) {
    return { maxDimension: 1600, quality: 0.78, type: 'image/jpeg', extension: 'jpg' }
  }

  if (
    directory.startsWith('payments') ||
    directory.startsWith('maintenance') ||
    directory.startsWith('violations') ||
    directory.startsWith('liquidations')
  ) {
    return { maxDimension: 1200, quality: 0.72, type: 'image/jpeg', extension: 'jpg' }
  }

  if (directory.startsWith('branding') || directory.startsWith('payment-channels')) {
    return { maxDimension: 1024, quality: 0.8, type: 'image/webp', extension: 'webp' }
  }

  return null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = URL.createObjectURL(file)
  })
}

function replaceExtension(fileName: string, extension: string): string {
  return fileName.replace(/\.[^.]+$/, '') + `.${extension}`
}
