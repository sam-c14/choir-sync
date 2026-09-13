const express = require('express');
const app = express();

const router = express.Router();
router.get('/', (req, res) => res.send('root'));
router.get('/:id', (req, res) => res.send(`id: ${req.params.id}`));

app.use('/api/v1/songs', router);

app.listen(3334, () => {
  const http = require('http');
  http.get('http://localhost:3334/api/v1/songs/c1034c73-85e6-460a-8317-928feff596dd', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('RESPONSE:', d));
  });
});
