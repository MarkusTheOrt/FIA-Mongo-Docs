export default {
  active_event:
    /\<div class=\"event-title active\"\>(?<active>[\s\S]+?)\<\/div\>/m,
  docuemnts_list: /class=\"event-title active\"\>[\s\S]+?(<li>[\s\S]+?<\/ul>)/,
  documents_block: /[<li>[\s\S]+?<\/li>]?/g,
  document_url: /href="(?<url>[\s\S]+?)"/,
  document_title: /"title">\s+([\s\S]+?)\s+<\/div>/,
  document_date: /date-display-single">([\d\.\ \:]+)</,
};
