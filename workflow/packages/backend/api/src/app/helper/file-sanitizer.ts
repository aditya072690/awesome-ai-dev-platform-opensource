import path from 'path'

export function sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
        throw new Error('Invalid file name')
    }

    let sanitized = fileName
    
    sanitized = sanitized.replace(/\.\./g, '')
    sanitized = sanitized.replace(/[\/\\]/g, '_')
    sanitized = sanitized.replace(/\0/g, '')
    
    sanitized = sanitized.substring(0, 255)
    
    if (sanitized.length === 0) {
        throw new Error('Invalid file name after sanitization')
    }
    
    return sanitized
}

export function validateFilePath(filePath: string, baseDir: string): string {
    const resolved = path.resolve(baseDir, filePath)
    if (!resolved.startsWith(path.resolve(baseDir))) {
        throw new Error('Invalid file path: path traversal detected')
    }
    return resolved
}

