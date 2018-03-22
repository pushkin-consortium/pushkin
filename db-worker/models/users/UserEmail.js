module.exports = db => {
  const UserEmail = db.Model.extend({
    tableName: 'users_emails',
    hasTimestamps: true,
    idAttribute: 'auth0_id',
  });
  return db.model('UserEmail', UserEmail);
};
