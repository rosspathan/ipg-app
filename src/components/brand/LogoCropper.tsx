import * as React from "react"

interface LogoCropperProps {
  src: string
  alt: string
  className?: string
}

/**
 * LogoCropper - Utility component that ensures logos fill the circular container
 * Auto-crops transparent edges and normalizes sizing for edge-to-edge display
 */
export function LogoCropper({ src, alt, className = "" }: LogoCropperProps) {
  const [croppedSrc, setCroppedSrc] = React.useState(src)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    // For raster images (PNG/JPG/WebP), perform transparent-edge autocrop
    if (src.match(/\.(png|jpg|jpeg|webp)$/i)) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Draw image to get pixel data
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const { data, width, height } = imageData

        // Find bounding box of non-transparent pixels (alpha > 2%)
        let minX = width, minY = height, maxX = 0, maxY = 0
        const threshold = 5 // alpha threshold (0-255)

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3]
            if (alpha > threshold) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        // Add 2px padding to prevent hard edges
        minX = Math.max(0, minX - 2)
        minY = Math.max(0, minY - 2)
        maxX = Math.min(width - 1, maxX + 2)
        maxY = Math.min(height - 1, maxY + 2)

        const cropWidth = maxX - minX + 1
        const cropHeight = maxY - minY + 1

        if (cropWidth > 0 && cropHeight > 0) {
          // Create cropped canvas
          canvas.width = cropWidth
          canvas.height = cropHeight
          ctx.drawImage(
            img,
            minX, minY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          )
          setCroppedSrc(canvas.toDataURL("image/png"))
        }
      }
      img.src = src
    }
  }, [src])

  return (
    <>
      <img
        src={croppedSrc}
        alt={alt}
        className={className}
        data-testid="logo-cropper"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center"
        }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  )
}
