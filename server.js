const express = require('express');
const mysql = require('mysql'); // Use mysql2 ao invés de mysql
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session'); // Adicionado
const app = express();
const port = 3000;

// Configurar a conexão com o banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'Distribuidora_Bebidas'
};

const db = mysql.createConnection(dbConfig);
const pool = mysql.createPool(dbConfig);

// Middleware para verificar se o usuário está autenticado
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.status(401).json({ message: 'Usuário não autenticado' });
    }
}

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
// Configurações de sessão
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
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

// Rota para remover um produto, verificando itenspedido relacionados
app.post('/removeProduct/:id', (req, res) => {
    const { id } = req.params;
    const queryCheck = 'SELECT * FROM itenspedido WHERE ProdutoID = ?';
    const deleteQuery = 'DELETE FROM Produtos WHERE ID = ?';

    // Verificar se há itenspedido relacionados ao produto
    db.query(queryCheck, [id], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }

        // Se houver itenspedido relacionados, remova-os primeiro
        if (results.length > 0) {
            const deleteItemsQuery = 'DELETE FROM itenspedido WHERE ProdutoID = ?';
            db.query(deleteItemsQuery, [id], (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                // Após remover itenspedido, exclua o produto
                db.query(deleteQuery, [id], (err, result) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.json({ message: 'Produto removido com sucesso.' });
                });
            });
        } else {
            // Se não houver itenspedido relacionados, exclua diretamente o produto
            db.query(deleteQuery, [id], (err, result) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.json({ message: 'Produto removido com sucesso.' });
            });
        }
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

// Rota para buscar um produto pelo ID
app.get('/getProduct/:ID', (req, res) => {
    const productID = req.params.ID;
    const query = 'SELECT * FROM Produtos WHERE ID = ?';
    db.query(query, [productID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para atualizar um produto
app.post('/updateProduct', (req, res) => {
    const { ID, Nome, Descricao, Preco, FornecedorID } = req.body;
    const checkQuery = 'SELECT * FROM Fornecedores WHERE ID = ?';
    db.query(checkQuery, [FornecedorID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(400).send('FornecedorID não encontrado.');
        }
        const updateQuery = 'UPDATE Produtos SET Nome = ?, Descricao = ?, Preco = ?, FornecedorID = ? WHERE ID = ?';
        db.query(updateQuery, [Nome, Descricao, Preco, FornecedorID, ID], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Produto atualizado com sucesso.');
        });
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

// Rotas para renderizar as páginas de gerenciamento
app.get('/admin-panel', (req, res) => {
    res.render('admin-panel');
});

app.get('/gerenClientes', (req, res) => {
    res.render('gerenClientes');
});

app.get('/gerenFornecedores', (req, res) => {
    res.render('gerenFornecedores');
});

app.get('/gerenProdutos', (req, res) => {
    res.render('gerenProdutos');
});

app.get('/gerenPedidos', (req, res) => {
    res.render('gerenPedidos');
});

app.get('/gerenItensPedido', (req, res) => {
    res.render('gerenItensPedido');
});

app.get('/gerenEstoque', (req, res) => {
    res.render('gerenEstoque');
});

// Rota para adicionar um fornecedor
app.post('/addSupplier', (req, res) => {
    const { Nome, Contato, Telefone, Email } = req.body;
    const insertQuery = 'INSERT INTO Fornecedores (Nome, Contato, Telefone, Email) VALUES (?, ?, ?, ?)';
    db.query(insertQuery, [Nome, Contato, Telefone, Email], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Fornecedor adicionado com sucesso.');
    });
});

// Rota para remover um fornecedor
app.post('/removeSupplier', (req, res) => {
    const { ID } = req.body;
    const updateQuery = 'UPDATE Produtos SET FornecedorID = NULL WHERE FornecedorID = ?';
    db.query(updateQuery, [ID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        const deleteQuery = 'DELETE FROM Fornecedores WHERE ID = ?';
        db.query(deleteQuery, [ID], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Fornecedor removido com sucesso.');
        });
    });
});

// Rota para listar todos os fornecedores
app.get('/listSuppliers', (req, res) => {
    const query = 'SELECT * FROM Fornecedores';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para buscar os dados de um fornecedor pelo ID
app.get('/getSupplier/:ID', (req, res) => {
    const { ID } = req.params;
    const query = 'SELECT * FROM Fornecedores WHERE ID = ?';
    db.query(query, [ID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(404).send('Fornecedor não encontrado.');
        }
        res.json(results[0]);
    });
});

// Rota para atualizar os dados de um fornecedor
app.post('/updateSupplier/:ID', (req, res) => {
    const { ID } = req.params;
    const { Nome, Contato, Telefone, Email } = req.body;
    const query = 'UPDATE Fornecedores SET Nome = ?, Contato = ?, Telefone = ?, Email = ? WHERE ID = ?';
    db.query(query, [Nome, Contato, Telefone, Email, ID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Fornecedor atualizado com sucesso.');
    });
});

// Rota para listar todos os clientes
app.get('/listClients', (req, res) => {
    const query = 'SELECT * FROM Clientes';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para remover um cliente
app.post('/removeClient', (req, res) => {
    const { ID } = req.body;
    const updateOrdersQuery = 'UPDATE Pedidos SET ClienteID = NULL WHERE ClienteID = ?';
    const deleteClientQuery = 'DELETE FROM Clientes WHERE ID = ?';
    
    db.query(updateOrdersQuery, [ID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        db.query(deleteClientQuery, [ID], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Cliente removido com sucesso.');
        });
    });
});

// Rota para buscar um cliente pelo ID
app.get('/getClient/:id', (req, res) => {
    const clientID = req.params.id;
    const query = 'SELECT * FROM Clientes WHERE ID = ?';
    db.query(query, [clientID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send('Cliente não encontrado.');
        }
        res.json(result[0]);
    });
});

// Rota para atualizar um cliente
app.post('/updateClient/:id', (req, res) => {
    const clientID = req.params.id;
    const { Nome, Endereco, Telefone, Email } = req.body;
    const query = 'UPDATE Clientes SET Nome = ?, Endereco = ?, Telefone = ?, Email = ? WHERE ID = ?';
    db.query(query, [Nome, Endereco, Telefone, Email, clientID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Cliente atualizado com sucesso.');
    });
});

// Rota para buscar pedidos por Cliente ID
app.get('/getOrders/:clienteID', (req, res) => {
    const clienteID = req.params.clienteID;
    const query = 'SELECT * FROM Pedidos WHERE ClienteID = ?';
    db.query(query, [clienteID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para adicionar um pedido
app.post('/addOrder', (req, res) => {
    const { ClienteID, DataPedido, StatusPedido } = req.body;
    const checkClientQuery = 'SELECT * FROM Clientes WHERE ID = ?';
    db.query(checkClientQuery, [ClienteID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(400).send('ClienteID não encontrado.');
        }
        const insertQuery = 'INSERT INTO Pedidos (ClienteID, DataPedido, StatusPedido) VALUES (?, ?, ?)';
        db.query(insertQuery, [ClienteID, DataPedido, StatusPedido], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Pedido adicionado com sucesso.');
        });
    });
});

// Rota para remover um pedido
app.post('/removeOrder', (req, res) => {
    const { ID } = req.body;
    const deleteOrderItemsQuery = 'DELETE FROM ItensPedido WHERE PedidoID = ?';
    const deleteOrderQuery = 'DELETE FROM Pedidos WHERE ID = ?';

    db.query(deleteOrderItemsQuery, [ID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        db.query(deleteOrderQuery, [ID], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Pedido removido com sucesso.');
        });
    });
});

// Rota para listar todos os pedidos
app.get('/listOrders', (req, res) => {
    const query = 'SELECT * FROM Pedidos';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para buscar um pedido pelo ID
app.get('/getOrder/:id', (req, res) => {
    const orderID = req.params.id;
    const query = 'SELECT * FROM Pedidos WHERE ID = ?';
    db.query(query, [orderID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send('Pedido não encontrado.');
        }
        res.json(result[0]);
    });
});

// Rota para atualizar um pedido
app.post('/updateOrder/:id', (req, res) => {
    const orderID = req.params.id;
    const { ClienteID, DataPedido, StatusPedido } = req.body;
    const query = 'UPDATE Pedidos SET ClienteID = ?, DataPedido = ?, StatusPedido = ? WHERE ID = ?';
    db.query(query, [ClienteID, DataPedido, StatusPedido, orderID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Pedido atualizado com sucesso.');
    });
});

// Rota para buscar itens do pedido por PedidoID
app.get('/getOrderItems/:pedidoID', (req, res) => {
    const pedidoID = req.params.pedidoID;
    const query = 'SELECT * FROM ItensPedido WHERE PedidoID = ?';
    db.query(query, [pedidoID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para listar todos os itens de pedido
app.get('/listOrderItems', (req, res) => {
    const query = 'SELECT * FROM ItensPedido';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para buscar um item de pedido pelo PedidoID e ProdutoID
app.get('/getOrderItem/:pedidoID/:produtoID', (req, res) => {
    const pedidoID = req.params.pedidoID;
    const produtoID = req.params.produtoID;
    const query = 'SELECT * FROM ItensPedido WHERE PedidoID = ? AND ProdutoID = ?';
    db.query(query, [pedidoID, produtoID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send('Item de pedido não encontrado.');
        }
        res.json(result[0]);
    });
});

// Rota para atualizar um item de pedido pelo PedidoID e ProdutoID
app.post('/updateOrderItem/:pedidoID/:produtoID', (req, res) => {
    const pedidoID = req.params.pedidoID;
    const produtoID = req.params.produtoID;
    const { Quantidade, PrecoUnitario } = req.body;
    const query = 'UPDATE ItensPedido SET Quantidade = ?, PrecoUnitario = ? WHERE PedidoID = ? AND ProdutoID = ?';
    db.query(query, [Quantidade, PrecoUnitario, pedidoID, produtoID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Item de pedido atualizado com sucesso.');
    });
});

// Rota para remover um item de pedido pelo PedidoID e ProdutoID
app.post('/removeOrderItem/:pedidoID/:produtoID', (req, res) => {
    const pedidoID = req.params.pedidoID;
    const produtoID = req.params.produtoID;
    const deleteQuery = 'DELETE FROM ItensPedido WHERE PedidoID = ? AND ProdutoID = ?';
    db.query(deleteQuery, [pedidoID, produtoID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Item de pedido removido com sucesso.');
    });
});

// Rota para obter detalhes de um produto pelo ID
app.get('/getProduct/:produtoID', (req, res) => {
    const produtoID = req.params.produtoID;
    const query = 'SELECT * FROM Produtos WHERE ID = ?';
    db.query(query, [produtoID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send('Produto não encontrado.');
        }
        res.json(result[0]); // Retorna apenas o objeto em si
    });
});

// Rota para adicionar um novo item de pedido
app.post('/addOrderItem', (req, res) => {
    const { PedidoID, ProdutoID, Quantidade, PrecoUnitario } = req.body;
    const insertQuery = 'INSERT INTO ItensPedido (PedidoID, ProdutoID, Quantidade, PrecoUnitario) VALUES (?, ?, ?, ?)';
    db.query(insertQuery, [PedidoID, ProdutoID, Quantidade, PrecoUnitario], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Item de pedido adicionado com sucesso.');
    });
});


// Rota para listar todos os registros de estoque
app.get('/listStock', (req, res) => {
    const query = 'SELECT * FROM Estoque';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para buscar um produto pelo ID e retornar informações do produto e seu estoque
app.get('/getProductStock/:produtoID', (req, res) => {
    const produtoID = req.params.produtoID;
    const query = `
        SELECT p.ID, p.Nome, p.Descricao, p.Preco, e.ID AS EstoqueID, e.DataMovimentacao, e.Quantidade, e.Tipo, e.Descricao AS DescricaoEstoque
        FROM Produtos p
        LEFT JOIN Estoque e ON p.ID = e.ProdutoID
        WHERE p.ID = ?`;
    db.query(query, [produtoID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Rota para atualizar um registro de estoque
app.post('/updateStock/:estoqueID', (req, res) => {
    const estoqueID = req.params.estoqueID;
    const { DataMovimentacao, Quantidade, Tipo, Descricao } = req.body;
    const updateQuery = 'UPDATE Estoque SET DataMovimentacao = ?, Quantidade = ?, Tipo = ?, Descricao = ? WHERE ID = ?';
    db.query(updateQuery, [DataMovimentacao, Quantidade, Tipo, Descricao, estoqueID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Registro de estoque atualizado com sucesso.');
    });
});

// Rota para adicionar um novo registro de estoque
app.post('/addStock', (req, res) => {
    const { ProdutoID, DataMovimentacao, Quantidade, Tipo, Descricao } = req.body;
    const checkQuery = 'SELECT * FROM Produtos WHERE ID = ?';
    db.query(checkQuery, [ProdutoID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (results.length === 0) {
            return res.status(400).send('ProdutoID não encontrado.');
        }
        const insertQuery = 'INSERT INTO Estoque (ProdutoID, DataMovimentacao, Quantidade, Tipo, Descricao) VALUES (?, ?, ?, ?, ?)';
        db.query(insertQuery, [ProdutoID, DataMovimentacao, Quantidade, Tipo, Descricao], (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.send('Registro de estoque adicionado com sucesso.');
        });
    });
});

// Rota para remover um registro de estoque
app.post('/removeStock/:estoqueID', (req, res) => {
    const estoqueID = req.params.estoqueID;
    const deleteQuery = 'DELETE FROM Estoque WHERE ID = ?';
    db.query(deleteQuery, [estoqueID], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('Registro de estoque removido com sucesso.');
    });
});

// Rota para buscar um registro de estoque pelo ID
app.get('/getStock/:estoqueID', (req, res) => {
    const estoqueID = req.params.estoqueID;
    const query = 'SELECT * FROM Estoque WHERE ID = ?';
    db.query(query, [estoqueID], (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});


// Rota para buscar informações de um produto
app.get('/produto/:id', (req, res) => {
    const productId = req.params.id;

    pool.query('SELECT * FROM Produtos WHERE ID = ?', [productId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Erro ao buscar produto' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        const product = results[0];
        res.json({
            id: product.ID,
            name: product.Nome,
            price: product.Preco,
            image: getImagePath(product.Nome) // Função para obter o caminho da imagem do produto
        });
    });
});

// Função para obter o caminho da imagem do produto (você pode ajustar conforme necessário)
function getImagePath(productName) {
    switch (productName) {
        case 'Brahma 300ml':
            return '/Garrafa_de_Cerveja_Brahma_Chope_300ML_PNG_Transparente_Sem_Fundo.png';
        case 'Beats Senses 1L':
            return 'Beats_Senses_1L.png';
        case 'Vinho Tinto Malbec Novecento 750ml':
            return 'Vinho_Tinto_Malbec_Novecento_750ml.png';
        case 'Whisky Johnnie Walker Red Label 1L':
            return 'Whisky_Red_Label_PNG_Transparente_Sem_Fundo.png';
        case 'Sacola Embalada Com Gelo':
            return 'Sacola_Embalada_Com_Gelo.png';
        default:
            return 'default.png';
    }
}

// Rota para finalizar o pedido
app.post('/finalizar-pedido', isAuthenticated, async (req, res) => {
    console.log('UserID:', req.session.user); // Check if userID is correctly defined
    const { cartItems } = req.body;
    const userId = req.session.user.ID; // Ensure you're accessing the correct user ID

    // Verify user authentication
    if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    try {
        // Start transaction
        await pool.query('START TRANSACTION');

        // Insert order
        const resultPedido = await pool.query(
            'INSERT INTO Pedidos (ClienteID, DataPedido, StatusPedido) VALUES (?, CURRENT_DATE, ?)',
            [userId, 'Pendente']
        );

        const pedidoId = resultPedido.insertId; // Obtain the inserted ID

        // Insert order items
        for (const item of cartItems) {
            await pool.query(
                'INSERT INTO ItensPedido (PedidoID, ProdutoID, Quantidade, PrecoUnitario) VALUES (?, ?, ?, ?)',
                [pedidoId, item.id, item.quantity, item.price]
            );
        }

        // Commit transaction
        await pool.query('COMMIT');
        res.json({ message: 'Pedido finalizado com sucesso' });

    } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Erro ao finalizar pedido' });
    }
});




// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
