// Ảnh / footage / âm thanh do người dùng đưa vào. Gọi media('images/tank.jpg'):
// tools/build.py tìm file ở projects/<id>/input/ trước, rồi library/, và chép vào public/media/.
// Chỉ viết đường dẫn dạng chuỗi hằng để build.py quét được.
import { staticFile } from 'remotion';

export const media = (p: string) => staticFile(`media/${p}`);
