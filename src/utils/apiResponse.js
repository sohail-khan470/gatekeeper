export const apiResponse = {
  success(res, data, statusCode) {
    return res.status(statusCode).json({
      success: true,
      data: data,
    });
  },
  error(res, statusCode, message, code = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code: code,
        message: message,
      },
    });
  },
};
