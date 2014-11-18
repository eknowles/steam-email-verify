module.exports = {
  username: 'asdfasdfasddf',
  password: "asdfasdf",
  host: 'imap.zoho.com',
  port: 993,
  tls: true,
  tlsOptions: {rejectUnauthorized: false},
  mailbox: "INBOX", // mailbox to monitor
  searchFilter: [
    "UNSEEN"
  ], // the search filter being used after an IDLE notification has been retrieved //
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
  mailParserOptions: {streamAttachments: true}, // options to be passed to mailParser lib.
  attachments: false, // download attachments as they are encountered to the project directory
  attachmentOptions: {directory: "attachments/"}, // specify a download directory for attachments
  steamPasswordSecret: "(*)&$",
  lowDB: 'db.json'
};