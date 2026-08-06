const SPREADSHEET_ID = "1LiCy1EMhT2-nO4S15ymDtD4OR96Rzk_BZYdcQTtnajg";
const SHEET_NAME = "시트1";
const HEADER_ROW = 4;
const DATA_START_ROW = 5;

function doGet(e) {
  try {
    const request = e && e.parameter ? e.parameter : {};
    authorize_(request.token);
    if (request.action !== "status") throw new Error("지원하지 않는 요청입니다.");
    const sheet = getAssetSheet_();
    return json_({ ok: true, count: Math.max(sheet.getLastRow() - HEADER_ROW, 0), updatedAt: Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss") });
  } catch (error) { return json_({ ok: false, error: error.message }); }
}

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    authorize_(request.token);
    if (request.action !== "validate") throw new Error("지원하지 않는 요청입니다.");
    const team = normalize_(request.team);
    const name = normalize_(request.name);
    const asset = normalize_(request.asset);
    const enteredNumber = normalize_(request.assetNumber).toUpperCase();
    if (!team || !name || !asset || !enteredNumber) throw new Error("필수 입력값이 누락되었습니다.");

    const sheet = getAssetSheet_();
    const lastRow = sheet.getLastRow();
    const rows = lastRow >= DATA_START_ROW ? sheet.getRange(DATA_START_ROW, 2, lastRow - DATA_START_ROW + 1, 4).getDisplayValues() : [];
    const personIndex = rows.findIndex(function(row) { return normalize_(row[0]) === team && normalize_(row[1]) === name; });
    let matched = false;
    let targetRow = null;
    let expectedAsset = null;
    let expectedAssetNumber = null;

    if (personIndex >= 0) {
      targetRow = DATA_START_ROW + personIndex;
      expectedAsset = normalize_(rows[personIndex][2]);
      expectedAssetNumber = normalize_(rows[personIndex][3]).toUpperCase();
      matched = expectedAsset === asset && expectedAssetNumber === enteredNumber;
      sheet.getRange(targetRow, 6, 1, 2).setValues([[matched ? "일치" : "불일치", enteredNumber]]);
    } else {
      appendLog_(team, name, asset, enteredNumber, "대상 없음");
    }

    return json_({ ok: true, matched: matched, status: matched ? "일치" : personIndex >= 0 ? "불일치" : "대상 없음", row: targetRow, expectedAsset: expectedAsset, expectedAssetNumber: expectedAssetNumber, checkedAt: Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss") });
  } catch (error) { return json_({ ok: false, error: error.message }); }
}

function getAssetSheet_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("시트1을 찾을 수 없습니다.");
  return sheet;
}
function appendLog_(team, name, asset, assetNumber, status) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let logSheet = spreadsheet.getSheetByName("검증기록");
  if (!logSheet) { logSheet = spreadsheet.insertSheet("검증기록"); logSheet.appendRow(["검증 시각", "팀", "이름", "자산", "입력된 자산 번호", "결과"]); }
  logSheet.appendRow([new Date(), team, name, asset, assetNumber, status]);
}
function authorize_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("ASSETLY_TOKEN");
  if (!expected || token !== expected) throw new Error("인증에 실패했습니다.");
}
function normalize_(value) { return String(value == null ? "" : value).trim(); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }