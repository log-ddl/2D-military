// Tách chủ thể (người, khí tài) khỏi nền bằng Vision của macOS (không cần mạng, không cần model ngoài) → PNG có kênh alpha.
// img.py biên dịch và gọi file này:  cutout <ảnh vào> <png ra>
import AppKit
import CoreImage
import Vision

let a = CommandLine.arguments
guard a.count >= 3, let src = CIImage(contentsOf: URL(fileURLWithPath: a[1]), options: [.applyOrientationProperty: true]) else { print("ERR không mở được ảnh"); exit(1) }
guard #available(macOS 14.0, *) else { print("ERR cần macOS 14 trở lên"); exit(1) }
let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: src, options: [:])
do { try handler.perform([req]) } catch { print("ERR \(error.localizedDescription)"); exit(1) }
guard let res = req.results?.first, !res.allInstances.isEmpty else { print("ERR không thấy chủ thể nổi bật trong ảnh"); exit(1) }
guard let buf = try? res.generateMaskedImage(ofInstances: res.allInstances, from: handler, croppedToInstancesExtent: true) else { print("ERR không tạo được mặt nạ"); exit(1) }
let out = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
guard let cs = CGColorSpace(name: CGColorSpace.sRGB), let png = ctx.pngRepresentation(of: out, format: .RGBA8, colorSpace: cs) else { print("ERR không ghi được PNG"); exit(1) }
try! png.write(to: URL(fileURLWithPath: a[2]))
print("OK \(Int(out.extent.width))x\(Int(out.extent.height))")
