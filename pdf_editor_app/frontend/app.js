import WebViewer from "@pdftron/webviewer";

const fileInput = document.getElementById("fileInput");
const openBtn = document.getElementById("openBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusEl = document.getElementById("status");
const licenseNotice = document.getElementById("licenseNotice");
const viewerElement = document.getElementById("viewer");

let viewerInstance;
let contentEditManager;
let currentFilename = "edited.pdf";
let documentLoaded = false;
let editModeActive = false;
let onContentBoxSelected;

openBtn.addEventListener("click", openFilePicker);
fileInput.addEventListener("change", openSelectedFile);
fileInput.addEventListener("cancel", () => setStatus("No file selected."));
downloadBtn.addEventListener("click", downloadEditedPdf);

WebViewer(
  {
    path: `${import.meta.env.BASE_URL}lib`,
    licenseKey: import.meta.env.VITE_APRYSE_LICENSE_KEY || undefined,
    preloadWorker: "contentEdit",
    enableFilePicker: true
  },
  viewerElement
).then((instance) => {
  viewerInstance = instance;
  openBtn.disabled = false;
  licenseNotice.hidden = Boolean(import.meta.env.VITE_APRYSE_LICENSE_KEY);

  instance.UI.disableElements([
    "default-top-header",
    "toolbarGroup-Annotate",
    "toolbarGroup-Shapes",
    "toolbarGroup-Insert",
    "toolbarGroup-Edit",
    "toolbarGroup-FillAndSign",
    "toolbarGroup-Forms",
    "leftPanelButton",
    "cropToolButton",
    "snippingToolButton",
    "notesPanelToggle"
  ]);

  instance.Core.documentViewer.addEventListener("documentLoaded", () => {
    documentLoaded = true;
    instance.UI.setFitMode(instance.UI.FitMode.FitPage);
    contentEditManager = instance.Core.documentViewer.getContentEditManager();
    onContentBoxSelected = (annotations, action) => {
      if (action !== "selected") return;
      const textBox = annotations.find((annotation) =>
        annotation.isContentEditPlaceholder?.() &&
        annotation.getContentEditType?.().toLowerCase().includes("text")
      );
      if (!textBox || contentEditManager.isContentBoxEditorActive(textBox)) return;
      contentEditManager.startEditingContentBox(textBox).catch((error) => {
        console.error("Could not open the selected PDF text:", error);
        setStatus("This text box could not be opened for editing. It may be scanned or unsupported.", true);
      });
    };
    instance.Core.annotationManager.addEventListener("annotationSelected", onContentBoxSelected);
    downloadBtn.disabled = false;
    startDirectEditing();
  });

  instance.Core.documentViewer.addEventListener("documentUnloaded", resetEditorControls);
  setStatus("Ready. Choose a PDF to begin.");
}).catch((error) => {
  console.error("Could not start the PDF editor:", error);
  setStatus("The PDF editor could not start. Check that its files are served correctly.", true);
});

async function openSelectedFile() {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (!viewerInstance) {
    setStatus("The editor is still starting. Wait a moment, then choose the PDF again.", true);
    fileInput.value = "";
    return;
  }

  resetEditorControls();
  currentFilename = file.name.replace(/\.pdf$/i, "") + "-edited.pdf";
  setStatus(`Opening ${file.name}…`);

  try {
    await viewerInstance.UI.loadDocument(file, { filename: file.name });
  } catch (error) {
    console.error("Could not open PDF:", error);
    setStatus("Could not open that PDF. It may be damaged or password protected.", true);
  } finally {
    fileInput.value = "";
  }
}

function openFilePicker() {
  if (!viewerInstance) {
    setStatus("The editor is still starting. Please wait a moment.", true);
    return;
  }

  setStatus("Choose a PDF in the file picker…");
  try {
    if (typeof fileInput.showPicker === "function") fileInput.showPicker();
    else fileInput.click();
  } catch {
    fileInput.click();
  }
}

async function startDirectEditing() {
  if (!documentLoaded || !contentEditManager || editModeActive) return;
  setStatus("Preparing text editing…");
  try {
    const documentViewer = viewerInstance.Core.documentViewer;
    const editTool = documentViewer.getTool(viewerInstance.Core.Tools.ToolNames.CONTENT_EDIT);
    if (!editTool) throw new Error("The PDF text editing tool is unavailable.");
    documentViewer.setToolMode(editTool);
    editModeActive = true;
    setStatus("Click a text box once to start typing. Save the PDF when you’re done.");
  } catch (error) {
    console.error("Could not start direct PDF text editing:", error);
    setStatus("Could not enable text editing for this PDF. Try another PDF or check its permissions.", true);
  }
}

async function downloadEditedPdf() {
  if (!viewerInstance || !documentLoaded) return;

  downloadBtn.disabled = true;
  setStatus("Saving your edited PDF…");

  try {
    if (editModeActive) {
      await contentEditManager.endContentEditMode({ dispose: true });
      editModeActive = false;
    }
    const pdfDocument = viewerInstance.Core.documentViewer.getDocument();
    const data = await pdfDocument.getFileData({
      downloadType: "pdf",
      includeAnnotations: true
    });
    const blob = new Blob([data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = currentFilename;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Edited PDF downloaded. The original file was not changed.");
  } catch (error) {
    console.error("Could not save edited PDF:", error);
    setStatus(`Could not save the PDF: ${error.message}`, true);
    if (documentLoaded && !editModeActive) await startDirectEditing();
  } finally {
    downloadBtn.disabled = !documentLoaded;
  }
}

function resetEditorControls() {
  if (onContentBoxSelected && viewerInstance) {
    viewerInstance.Core.annotationManager.removeEventListener("annotationSelected", onContentBoxSelected);
  }
  onContentBoxSelected = undefined;
  documentLoaded = false;
  editModeActive = false;
  contentEditManager = undefined;
  downloadBtn.disabled = true;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}
