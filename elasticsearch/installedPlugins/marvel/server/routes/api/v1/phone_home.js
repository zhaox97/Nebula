const root = require('requirefrom')('');
const handleError = root('server/lib/handle_error');

module.exports = (server) => {
  const callWithRequest = server.plugins.elasticsearch.callWithRequest;
  const config = server.config();

  server.route({
    path: '/api/marvel/v1/phone-home',
    method: 'POST',
    handler: (req, reply) => {
      const body = req.payload;
      const options = {
        index: '.marvel',
        type: 'phone_home',
        body: body
      };
      callWithRequest(req, 'index', options)
      .then(reply)
      .catch(err => reply(handleError(err, req)));
    }
  });
};
