// cambiar a false o true si quieren usar heroku o no
const use_heroku = true;

//const url = use_heroku ? 'https://redex-backend.herokuapp.com/' : 'http://localhost:5000/';
const url = use_heroku ? 'http://10.101.57.99:5000/' : 'http://localhost:5000/';
export default url;