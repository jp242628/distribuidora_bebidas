const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session'); // Adicionado
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
app.use(express.static(path.join(__dirname, 'public'))); // Middleware para servir arquivos estáticos

// Middleware de sessão
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

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

// Rota para renderizar a página de login
app.get('/login', (req, res) => {
    res.render('login');
});

// Rota para login de usuário
app.post('/login', (req, res) => {
    const { email } = req.body;

    const query = 'SELECT * FROM Clientes WHERE Email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro no servidor' });
        }

        if (results.length > 0) {
            req.session.user = results[0]; // Armazena o usuário na sessão
            res.json({ success: true, user: results[0] }); // Retorna sucesso e dados do cliente
        } else {
            res.json({ success: false, message: 'E-mail não encontrado.' });
        }
    });
});

// Rota para registro de usuário
app.post('/register', (req, res) => {
    const { email, nome, endereco, telefone } = req.body;

    const insertQuery = 'INSERT INTO Clientes (Nome, Endereco, Telefone, Email) VALUES (?, ?, ?, ?)';
    db.query(insertQuery, [nome, endereco, telefone, email], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro no servidor' });
        }

        req.session.user = { Nome: nome, Email: email, Endereco: endereco, Telefone: telefone }; // Armazena o usuário na sessão
        res.json({ success: true, user: { Nome: nome, Email: email, Endereco: endereco, Telefone: telefone } }); // Retorna sucesso e dados do cliente
    });
});

// Rota para renderizar a página inicial
app.get('/', (req, res) => {
    const user = req.session.user || null;
    res.render('index', { user });
});

// Função para verificar formato de e-mail
function isValidEmail(email) {
    return email.includes('@') && email.includes('.');
}

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

// Rota para renderizar a página de conta do cliente
app.get('/conta-do-cliente', (req, res) => {
    const user = req.session.user || null;
    res.render('conta-do-cliente', { user });
});

// Rota para atualizar informações do cliente
app.post('/atualizarCliente', (req, res) => {
    const { ID, Nome, Endereco, Telefone, Email } = req.body;
    const sql = 'UPDATE Clientes SET Nome = ?, Endereco = ?, Telefone = ?, Email = ? WHERE ID = ?';
    const values = [Nome, Endereco, Telefone, Email, ID];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Erro ao atualizar o cliente:', err);
            res.json({ message: 'Erro ao atualizar o cliente.', type: 'error' });
            return;
        }

        if (result.affectedRows === 0) {
            res.json({ message: 'Nenhuma linha foi atualizada. Verifique o ID do cliente.', type: 'error' });
        } else {
            res.json({ message: 'Informações do cliente atualizadas com sucesso.', type: 'success' });
        }
    });
});

// Rota para logout do cliente
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            res.status(500).json({ message: 'Erro ao fazer logout', type: 'error' });
            return;
        }
        res.json({ message: 'Logout realizado com sucesso', type: 'success' });
    });
});

// Rota para excluir a conta do cliente
app.post('/excluirConta', (req, res) => {
    const { ID } = req.body;

    // Atualizar os pedidos para definir ClienteID como null
    const updatePedidosSql = 'UPDATE Pedidos SET ClienteID = NULL WHERE ClienteID = ?';
    db.query(updatePedidosSql, [ID], (err, updateResult) => {
        if (err) {
            console.error('Erro ao atualizar pedidos:', err);
            res.status(500).json({ message: 'Erro ao atualizar pedidos', type: 'error' });
            return;
        }

        // Excluir o cliente da tabela Clientes
        const deleteClientSql = 'DELETE FROM Clientes WHERE ID = ?';
        db.query(deleteClientSql, [ID], (err, deleteResult) => {
            if (err) {
                console.error('Erro ao excluir a conta do cliente:', err);
                res.status(500).json({ message: 'Erro ao excluir a conta do cliente', type: 'error' });
                return;
            }

            res.json({ message: 'Conta do cliente excluída com sucesso', type: 'success' });
        });
    });
});

// Rota para listar os pedidos do cliente
app.get('/listarPedidos', (req, res) => {
    const clienteID = req.session.user && req.session.user.ID; // Recupera o ID do cliente da sessão
    if (!clienteID) {
        res.status(400).json({ message: 'Cliente não está logado ou ID do cliente não encontrado na sessão.', type: 'error' });
        return;
    }

    const sql = 'SELECT * FROM Pedidos WHERE ClienteID = ?';
    db.query(sql, [clienteID], (err, results) => {
        if (err) {
            console.error('Erro ao listar os pedidos:', err);
            res.status(500).send('Erro ao listar os pedidos');
            return;
        }

        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
