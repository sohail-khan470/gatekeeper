const requestTestMiddleware = (req, res, next) => {
  res.locals.people = {
    person1: 'sam',
    person2: 'jack',
  };
  console.log('Test Middleware');

  next();
};

export default requestTestMiddleware;
