module.exports = db => {
  const User = db.Model.extend(
    {
      tableName: 'bloodmagic_users',
      idAttribute: 'id',
      hasTimestamps: true,
      responses: function() {
        return this.hasMany('Response', 'user_id', 'id');
      },
      stimulusResponses: function() {
        return this.hasMany('StimulusResponse', 'user_id', 'id');
      }
    },
    {
      dependents: ['responses', 'stimulusResponses']
    }
  );
  return db.model('User', User);
};
