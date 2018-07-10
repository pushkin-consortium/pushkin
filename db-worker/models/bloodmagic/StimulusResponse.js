module.exports = db => {
  const StimulusResponse = db.Model.extend({
    tableName: 'myStimulusResponses',
    idAttribute: 'id',
    hasTimestamps: true,
    user: function() {
      return this.belongsTo('User', 'user_id', 'id');
    },
    stimulus: function() {
      return this.belongsTo('Stimulus', 'stimulus', 'stimulus')
    }
  });
  return db.model('StimulusResponse', StimulusResponse);
};
