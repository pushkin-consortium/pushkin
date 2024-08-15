// __mocks__/axios.js
const axios = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    head: jest.fn().mockResolvedValue({ data: {} }),
    options: jest.fn().mockResolvedValue({ data: {} }),
    create: jest.fn().mockReturnThis() // Ensures that create returns an instance with all the same mocked methods
  };
  
  // Mock all instance methods as well
  axios.create.mockImplementation(() => axios);
  
  export default axios;
  