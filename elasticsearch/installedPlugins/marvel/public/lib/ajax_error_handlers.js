module.exports = function ajaxErrorHandlersProvider(Notifier) {
  return {
    /* full-screen error message */
    fatalError(err) {
      if (err.status === 403) {
        const shieldNotifier = new Notifier({ location: 'Shield' });
        return shieldNotifier.fatal('Sorry, you are not authorized to access Marvel');
      }
      const genericNotifier = new Notifier({ location: 'Marvel' });
      return genericNotifier.fatal(err);
    },
    /* dismissable banner message */
    nonFatal(err) {
      const notifier = new Notifier({ location: 'Marvel' });
      return notifier.error(err);
    }
  };
};
