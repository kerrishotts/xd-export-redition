const { renderToFile } = require("../file-handlers/render.js");
const { formStyles } = require("./styles.js");
const {
  createPrefs,
  getPrefs,
  getImageTypeOptions,
  defaultPrefs
} = require("../file-handlers/prefs.js");

/**
 * Shows the control dialog modal, passing back any return value from the modal.
 * @returns {(string|Object)} Error string or Object containing settings for the render.
 */
async function getResultFromControlDialog(strings, selectionItemToRender) {
  const initialPrefs = await getPrefs();

  const dialog = await getControlDialog(
    strings,
    selectionItemToRender,
    initialPrefs
  );
  return await dialog.showModal();
}

/**
 * Appends the dialog to the DOM.
 * @param {Object} initialPrefs - An object of preference settings currently stored in prefs.json.
 * @returns {HTMLDialogElement} The control dialog element.
 */
async function getControlDialog(strings, selectionItemToRender, initialPrefs) {
  const imageTypeOptions = getImageTypeOptions();
  const previewRenditionResults = await renderToFile(
    selectionItemToRender,
    {
      ...defaultPrefs,
      scale: 0.8,
      filename: "preview"
    },
    { preview: true }
  );

  // HTML markup
  document.body.innerHTML = `
    ${formStyles}
    <dialog id="control-dialog">
      <form id="control-form" method="dialog">
        <h1>${strings.h1}</h1>

        <div id="controls" class="section">
          <label class="row row-wrapper">
            <span>${strings.filenameLabel}</span>
            <input id="file-name" type="text" uxp-quiet="false" placeholder="${
              strings.filenamePlaceholder
            }" ${
    initialPrefs.filename.length ? `value="${initialPrefs.filename}"` : null
  } />
          </label>
          <label class="row row-wrapper">
            <span>${strings.renditionTypeLabel}</span>
            <select id="file-type-select">
              ${imageTypeOptions.map(el => {
                return `<option value="${el}">${el.toUpperCase()}</option>`;
              })}
            </select>
          </label>
          <label>
            <div class="row spread">
              <span>${strings.renderScaleLabel}</span>
              <span id="scale-display-value">${initialPrefs.scale}x</span>
            </div>
            <input id="scale-range" type="range" min=1 max=5 step=1 value=${
              initialPrefs.scale
            } />
          </label>
          <label class="row row-wrapper">
            <span>${strings.overwriteFileLabel}</span>
            <input type="checkbox" id="overwrite-file"/ ${
              initialPrefs.overwriteFile ? "checked" : ""
            }>
          </label>
        </div>

        <div id="preview" class="section">
          <h2>Image preview</h2>
          <label class="row row-wrapper img-wrapper">
            <img src="${previewRenditionResults[0].outputFile.url}" />
          </label>
        </div>

        <footer>
          <button id="cancel-button">${strings.cancelButton}</button>
          <button type="submit" uxp-variant="cta" id="ok-button">${
            strings.okButton
          }</button>
        </footer>

      </form>
    </dialog>
  `;
  setSelectedFileType(imageTypeOptions, initialPrefs.renditionType);

  return getControlDialogWithEventHandlers(initialPrefs);
}

/**
 * Adds the required event handlers to the control dialog.
 * @param {Object} initialPrefs - An object of preference settings currently stored in prefs.json.
 * @returns {HTMLDialogElement} The control dialog element.
 */
function getControlDialogWithEventHandlers(initialPrefs) {
  // Add event handlers
  const [dialog, form, scaleRange, cancelButton, okButton] = [
    "#control-dialog",
    "#control-dialog form",
    "#scale-range",
    "#cancel-button",
    "#ok-button"
  ].map(s => document.querySelector(s));

  // Close dialog when cancel is clicked.
  // Note that XD handles the ESC key for you, also returning `reasonCanceled`
  cancelButton.addEventListener("click", _ => dialog.close("reasonCanceled"));

  // Handle ok button click
  okButton.addEventListener("click", e =>
    handleSubmit(e, dialog, initialPrefs)
  );
  // Handle form submit via return key
  form.onsubmit = e => handleSubmit(e, dialog, initialPrefs);

  // Update display value for render scale when the range is changed.
  const scaleDisplayValue = document.querySelector("#scale-display-value");
  scaleRange.addEventListener(
    "change",
    e => (scaleDisplayValue.textContent = `${e.target.value}x`)
  );

  return dialog;
}

/**
 * Sets the selected file type in the dropdown according to store preferences.
 * This is a workaround since UXP dropdowns don't yet support `selected` / `disabled`.
 * https://adobexdplatform.com/plugin-docs/reference/ui/elements/dropdowns.html#known-issues
 * @param {application.RenditionType[]} imageTypeOptions - All XD-supported image types for render.
 * @param {string} imageTypePref - The preference setting for rendition type currently stored in prefs.json.
 */
function setSelectedFileType(imageTypeOptions, imageTypePref) {
  const select = document.querySelector("#file-type-select");
  select.selectedIndex = imageTypeOptions.indexOf(imageTypePref);
}

async function handleSubmit(e, dialog, initialPrefs) {
  saveAndClose(dialog, initialPrefs);
  e.preventDefault();
}

/**
 * Saves preferences and closes the dialog, passing back those saved preferences.
 * @param {HTMLDialogElement} dialog The control dialog element.
 * @param {Object} initialPrefs - An object of preference settings currently stored in prefs.json.
 * @returns {Object} Updated preferences stored in prefs.json.
 */
async function saveAndClose(dialog, initialPrefs) {
  const savedPrefs = await savePrefs(initialPrefs);

  return await dialog.close(savedPrefs);
}

async function savePrefs(initialPrefs) {
  const prefsToSave = getSettingsFromForm(initialPrefs);
  return await createPrefs(prefsToSave);
}

/**
 * Gets preferences to save by retrieving setting values from the DOM.
 * @param {Object} initialPrefs - An object of preference settings currently stored in prefs.json.
 * @returns {Object} Rendition setting values retrieved from DOM.
 */
function getSettingsFromForm(initialPrefs) {
  const [filenameInput, filetypeSelect, scaleRange, overwriteFile] = [
    "#file-name",
    "#file-type-select",
    "#scale-range",
    "#overwrite-file"
  ].map(sel => document.querySelector(sel));

  return {
    ...initialPrefs,
    renditionType: filetypeSelect.value,
    overwriteFile: overwriteFile.checked ? true : false,
    scale: Number(scaleRange.value),
    filename: filenameInput.value
  };
}

module.exports = {
  getResultFromControlDialog
};
