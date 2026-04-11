export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function runFormuLensAnalysis(
  topic: string,
  files: File[],
  onChunk: (text: string) => void
) {
  try {
    const processedFiles = await Promise.all(files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        mimeType: file.type,
        data: base64.split(",")[1]
      };
    }));

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        files: processedFiles
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze papers');
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  } catch (error) {
    console.error("Error running FormuLens analysis:", error);
    throw error;
  }
}
