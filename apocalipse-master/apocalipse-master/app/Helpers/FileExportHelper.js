const fs = require('fs');
const excel = require('exceljs');
const moment = require('moment-timezone');
class FileExportHelper {
  async export(path, file_name, extension, sheet_name, data, columns = null) {
    file_name += `_${moment()
      .tz('America/Recife')
      .clone()
      .format('YMMDD_HHmmss')}`;

    let split_path = path.split('/');
    let complete_path = '';
    for (let item_folder of split_path) {
      if (complete_path == '') complete_path = item_folder;
      else complete_path += `/${item_folder}`;

      if (!fs.existsSync(complete_path)) {
        fs.mkdirSync(complete_path);
      }
    }
    const workbook = new excel.Workbook();
    let sheet = workbook.addWorksheet(sheet_name);

    let sheetColumns = [];
    if (columns && columns.length > 0) {
      sheetColumns = columns;
    } else {
      for (let field of Object.keys(data[0])) {
        sheetColumns.push({
          header: field,
          key: field,
          width: 100,
        });
      }
    }

    sheet.columns = sheetColumns;

    for (let item of data) {
      sheet.addRow(item);
    }

    let full_path_file = `${path}/${file_name}.${extension}`;
    if (extension == 'xlsx') {
      await workbook.xlsx.writeFile(full_path_file);
    } else if (extension == 'csv') {
      await workbook.csv.writeFile(full_path_file);
    }

    return full_path_file;
  }
}

module.exports = FileExportHelper;
