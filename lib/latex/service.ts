const defaultLatexServiceUrl = "http://127.0.0.1:8000";

function getLatexServiceUrl(): string {
  return (
    process.env.LATEX_SERVICE_URL?.replace(/\/$/, "") ?? defaultLatexServiceUrl
  );
}

export async function compileLatexToPdf(tex: string): Promise<ArrayBuffer> {
  const response = await fetch(`${getLatexServiceUrl()}/compile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tex })
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string; details?: string }
      | null;
    throw new Error(
      errorBody?.details ??
        errorBody?.error ??
        "The LaTeX service could not compile this resume."
    );
  }

  return response.arrayBuffer();
}
