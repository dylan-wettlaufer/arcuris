const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = Number(process.env.PORT ?? 8000);
app.use(express.json({ limit: "5mb" }));

app.post("/compile", (req, res) => {
  const { tex } = req.body;
  if (!tex) return res.status(400).json({ error: "No tex content provided" });

  const jobId = uuidv4();
  const workDir = `/tmp/${jobId}`;
  const texFile = path.join(workDir, "resume.tex");

  // Create temp working directory
  fs.mkdirSync(workDir, { recursive: true });
  fs.writeFileSync(texFile, tex);

  // Run Tectonic to compile the .tex file
  exec(`tectonic ${texFile}`, { cwd: workDir }, (error, stdout, stderr) => {
    if (error) {
      console.error("Compilation error:", stderr);
      // Cleanup before returning error
      fs.rmSync(workDir, { recursive: true, force: true });
      return res.status(500).json({ 
        error: "Compilation failed", 
        details: stderr 
      });
    }

    const pdfPath = path.join(workDir, "resume.pdf");

    // Check PDF actually exists before reading
    if (!fs.existsSync(pdfPath)) {
      fs.rmSync(workDir, { recursive: true, force: true });
      return res.status(500).json({ error: "PDF not generated" });
    }

    const pdf = fs.readFileSync(pdfPath);
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);

    // Cleanup temp files
    fs.rmSync(workDir, { recursive: true, force: true });
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`LaTeX service running on port ${port}`);
});
