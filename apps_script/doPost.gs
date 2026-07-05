function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var expectedSecret = props.getProperty('WEBHOOK_SECRET');

    if (!data.secret || data.secret !== expectedSecret) {
      return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Unauthorized"})).setMimeType(ContentService.MimeType.JSON);
    }

    var allowedFolders = [props.getProperty('SUMMARIES_FOLDER_ID')];
    if (allowedFolders.indexOf(data.folder_id) === -1) {
      return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Folder not allowed"})).setMimeType(ContentService.MimeType.JSON);
    }

    var folder = DriveApp.getFolderById(data.folder_id);
    var file = folder.createFile(data.filename, data.content, MimeType.PLAIN_TEXT);

    return ContentService.createTextOutput(JSON.stringify({"status": "success", "fileId": file.getId()})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
