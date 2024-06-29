const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path'); 
const app = express();
const port = 3000;

// Configurar a conexão com o banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12',
    database: 'Distribuidora_Bebidas'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Conectado ao banco de dados MySQL.');
});

// Configurar o mecanismo de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para analisar o corpo das requisições
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rota para adicionar um produto
app.post('/addProduct', (req, res) => {
    const { ID, Nome, Descricao, Preco, FornecedorID } = req.body;
    // Verificar se o FornecedorID existe
    const checkQuery = 'SELECT * FROM Fornecedores WHERE ID = ?';
    db.query(checkQuery, [FornecedorID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(400).send('FornecedorID não encontrado.');
        }
        const insertQuery = 'INSERT INTO Produtos (ID, Nome, Descricao, Preco, FornecedorID) VALUES (?, ?, ?, ?, ?)';
        db.query(insertQuery, [ID, Nome, Descricao, Preco, FornecedorID], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Produto adicionado com sucesso.');
        });
    });
});

// Rota para remover um produto
app.post('/removeProduct', (req, res) => {
    const { ID } = req.body;
    const query = 'DELETE FROM Produtos WHERE ID = ?';
    db.query(query, [ID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Produto removido com sucesso.');
    });
});

// Rota para listar todos os produtos
app.get('/listProducts', (req, res) => {
    const query = 'SELECT * FROM Produtos';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Servir o arquivo HTML
app.get('/', (req, res) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
