const camelcaseToSnakeCase = (str) =>
  str.replace(/([A-Z])/g, '_$1').toLowerCase();

const convertKeysToSnakeCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = camelcaseToSnakeCase(key);
      acc[newKey] = convertKeysToSnakeCase(value);
      return acc;
    }, {});
  }
  return obj;
};

const camelToSnakeMiddleware = (req, res, next) => {
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body && typeof req.body === 'object') {
    req.body = convertKeysToSnakeCase(req.body);
  }
  next();
};

module.exports = camelToSnakeMiddleware;
