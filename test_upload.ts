import { upload } from '@vercel/blob/client';

async function test() {
  console.log("Starting upload test...");
  try {
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const newBlob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: 'http://localhost:3000/api/upload',
    });
    console.log("Success:", newBlob);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
