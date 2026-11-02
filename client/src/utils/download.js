import { http } from '../api/http.js';

// Downloads a protected file with the token and saves it under its real name.
export async function downloadFile(url, fileName) {
  const { data } = await http.get(url.replace(/^\/api/, ''), { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
