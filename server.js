const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Configurar a conexão com o banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12',
    database: 'Distribuidora_Bebidas'
};

const db = mysql.createConnection(dbConfig);

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

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota para adicionar um produto
app.post('/addProduct', (req, res) => {
    const { ID, Nome, Descricao, Preco, FornecedorID } = req.body;
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

// Rota para renderizar a página de login
app.get('/login', (req, res) => {
    res.render('login');
});

// Rota para login de usuário
app.post('/login', (req, res) => {
    const email = req.body.email;

    const query = 'SELECT * FROM Clientes WHERE Email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro no servidor' });
        }

        if (results.length > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    });
});

// Rota para cadastro de usuário
app.post('/register', (req, res) => {
    const email = req.body.email;

    const query = 'INSERT INTO Clientes (Email) VALUES (?)';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro no servidor' });
        }

        res.json({ success: true });
    });
});

// Rota para renderizar a página de login de administrador
app.get('/admin-login', (req, res) => {
    res.render('admin-login');
});

// Rota para autenticação de administrador
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    if (username === dbConfig.user && password === dbConfig.password) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Rota para renderizar o painel do administrador
app.get('/admin-panel', (req, res) => {
    res.send('<h1>Painel do Administrador</h1>');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
