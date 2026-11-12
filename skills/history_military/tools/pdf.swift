// Đọc PDF bằng PDFKit (macOS): tìm chữ, lấy hộp từng dòng của một đoạn trích, xuất trang ra JPEG. pdf.py biên dịch và gọi file này.
import PDFKit
import AppKit

let a = CommandLine.arguments
guard a.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else { print("{\"error\":\"không mở được PDF\"}"); exit(1) }

func rx(_ phrase: String) -> NSRegularExpression {
  // các từ cách nhau bởi khoảng trắng / xuống dòng / gạch nối cuối dòng bất kỳ
  let words = phrase.split(separator: " ").map { NSRegularExpression.escapedPattern(for: String($0)) }
  return try! NSRegularExpression(pattern: words.joined(separator: "[\\s\\-]+"), options: [.caseInsensitive])
}

func render(_ page: PDFPage, _ sc: CGFloat, _ out: String) -> (Int, Int) {
  let b = page.bounds(for: .mediaBox)
  let w = Int(b.width * sc), h = Int(b.height * sc)
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.current = ctx
  ctx.cgContext.setFillColor(NSColor.white.cgColor)
  ctx.cgContext.fill(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.cgContext.scaleBy(x: sc, y: sc)
  ctx.cgContext.translateBy(x: -b.minX, y: -b.minY)
  page.draw(with: .mediaBox, to: ctx.cgContext)
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92])!.write(to: URL(fileURLWithPath: out))
  return (w, h)
}

switch a[2] {
case "find":  // find <cụm từ>…  → mỗi lần khớp: p<chỉ số trang> + ngữ cảnh
  for i in 0..<doc.pageCount {
    guard let s = doc.page(at: i)?.string else { continue }
    let ns = s as NSString
    for q in a[3...] {
      for m in rx(q).matches(in: s, range: NSRange(location: 0, length: ns.length)) {
        let lo = max(0, m.range.location - 70), hi = min(ns.length, m.range.location + m.range.length + 110)
        print("p\(i)\t\(q)\t…\(ns.substring(with: NSRange(location: lo, length: hi - lo)).replacingOccurrences(of: "\n", with: " "))…")
      }
    }
  }
case "quote":  // quote <trang> <scale> <out.jpg> <cụm đầu> <cụm cuối>  → JSON {width,height,lines:[{x0,x1,y,h}]}
  let page = doc.page(at: Int(a[3])!)!, sc = CGFloat(Double(a[4])!)
  let s = page.string ?? "", ns = s as NSString, all = NSRange(location: 0, length: ns.length)
  guard let m0 = rx(a[6]).firstMatch(in: s, range: all) else { print("{\"error\":\"không thấy cụm đầu trên trang\"}"); exit(2) }
  let after = NSRange(location: m0.range.location, length: ns.length - m0.range.location)
  guard let m1 = rx(a[7]).firstMatch(in: s, range: after) else { print("{\"error\":\"không thấy cụm cuối sau cụm đầu\"}"); exit(2) }
  let range = NSRange(location: m0.range.location, length: m1.range.location + m1.range.length - m0.range.location)
  let b = page.bounds(for: .mediaBox)
  var lines: [String] = []
  for sel in page.selection(for: range)?.selectionsByLine() ?? [] {
    let r = sel.bounds(for: page)
    if r.width < 2 { continue }
    lines.append(String(format: "{\"x0\":%.0f,\"x1\":%.0f,\"y\":%.0f,\"h\":%.1f}", (r.minX - b.minX) * sc, (r.maxX - b.minX) * sc, (b.maxY - r.midY) * sc, r.height * sc * 0.62))
  }
  let (w, h) = render(page, sc, a[5])
  let txt = ns.substring(with: range).replacingOccurrences(of: "\n", with: " ").replacingOccurrences(of: "\"", with: "'")
  print("{\"width\":\(w),\"height\":\(h),\"text\":\"\(txt)\",\"lines\":[\(lines.joined(separator: ","))]}")
case "render":  // render <trang> <scale> <out.jpg>
  let (w, h) = render(doc.page(at: Int(a[3])!)!, CGFloat(Double(a[4])!), a[5])
  print("{\"width\":\(w),\"height\":\(h)}")
case "pages":
  print(doc.pageCount)
default:
  print("{\"error\":\"lệnh lạ\"}"); exit(1)
}
