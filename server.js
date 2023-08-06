const express = require('express');
const paypal = require('paypal-rest-sdk'); 
const paypalConfig = require('./config/paypal-config'); // Importando as configurações do PayPal
const braintree = require('braintree');

const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');
const productsData = require('./data/products.json');

paypal.configure({
    mode: paypalConfig.mode,
    client_id: paypalConfig.clientId,
    client_secret: paypalConfig.clientSecret,    
});

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: '7p3b4rmhqr77wttn',
  publicKey: 'mbhxxtgpmvz75c3b',
  privateKey: 'b1258daa570d2717de686d321e68bc1f',
});

// Configurar o Express para servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Set up view engine
app.set('view engine', 'ejs');

// Configurar o servidor de arquivos estáticos para servir as imagens
app.use('/data/images', express.static(path.join(__dirname, 'data/images')));

// Routes

app.get('/', (req, res) => {
  // Create a PayPal payment
  const paymentData = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
      payer_info: {
        email: req.query.email, // Email do comprador preenchido no formulário
        first_name: req.query.firstName, // Primeiro nome do comprador preenchido no formulário
        last_name: req.query.lastName, // Sobrenome do comprador preenchido no formulário
        // Adicione outras informações do comprador conforme necessário
      },
    },
    redirect_urls: {
        thank_you_url: 'http://localhost:'+PORT+'/thank-you',
        return_url: 'http://localhost:'+PORT+'/success',
        cancel_url: 'http://localhost:'+PORT+'/cancel',
    },
    transactions: [
      {
        amount: {
          total: '10,00',
        },
        description: 'Sample Description',
      },
    ],
  };

  paypal.payment.create(paymentData, (error, payment) => {
    if (error) {
      console.error(error);
      // return res.redirect('/cancel');
    }

    // const approvalUrl = payment.links.find((link) => link.rel === 'approval_url').href;
    // res.redirect(approvalUrl);
  });
  gateway.clientToken.generate({}, (error, response) => {
    if (error) {
      // Tratar erro
    }
    const clientToken = response.clientToken;
    res.render('index', { paypal: paypalConfig, clientToken }); // Adicione o clientToken aqui
  });
});

app.post('/pay', (req, res) => {
  // const nonce = req.body.payment_method_nonce;

  // Dados do pagamento a serem enviados ao PayPal
  const paymentData = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
    },
    redirect_urls: {
      return_url: 'http://localhost:'+PORT+'/success',
      cancel_url: 'http://localhost:'+PORT+'/cancel',
    },
    transactions: [
      {
        amount: {
          total: '10.00',
          currency: 'USD',
        },
        description: 'Sample Description',
      },
    ],
  };

  paypal.payment.create(paymentData, (error, payment) => {
    if (error) {
      console.error('Erro ao criar o pagamento do PayPal:', error);
      console.error('Detalhes do erro:', error.response.details);
      return res.redirect('/error'); // Redirecionar para uma página de erro
    }

    const approvalUrl = payment.links.find((link) => link.rel === 'approval_url').href;
    res.redirect(approvalUrl); // Redirecionar para a página de aprovação do PayPal
  });
  // return res.redirect('/thank-you');
});

// Rota para a página do catálogo
app.get('/catalog', (req, res) => {
    const products = require('./data/products.json');
    console.log(products);
    res.render('catalog', { products: productsData });
});

app.get('/success', (req, res) => {
   const payerId = req.query.PayerID;
   const paymentId = req.query.paymentId;


   res.render('success', { payerId, paymentId });  
});

app.get('/', (req, res) => {
  const paymentId = req.query.paymentId;
  const payerId = req.query.PayerID;

  const executePaymentData = {
    payer_id: payerId,
  };

  paypal.payment.execute(paymentId, executePaymentData, (error, payment) => {
    if (error) {
      console.error(error);
      return res.redirect('/cancel');
    }

    // Payment successful, show a success page
    res.render('success', { payment });
  });
});

// Defina a rota para a página de agradecimento após a conclusão da transação
app.get('/thank-you', (req, res) => {
    const transactionId = req.query.transaction_id; // Obter o ID da transação da query string
    res.render('thank-you', { transactionId }); // Renderizar a página de agradecimento com o ID da transação
});

app.get('/', (req, res) => {
  // Handle canceled payments
  res.render('cancel');
});

app.post('/process-payment', (req, res) => {
  const nonceFromTheClient = req.body.paymentMethodNonce;

  // Use o nonce recebido para criar a transação no Braintree
  gateway.transaction.sale(
    {
      amount: '10.00',
      paymentMethodNonce: nonceFromTheClient,
      options: {
        submitForSettlement: true,
      },
      shipping: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        // Adicione outros campos de informações do comprador conforme necessário
      },
    },
    (error, result) => {
      if (result.success) {
        // O pagamento foi bem-sucedido
        res.json({ success: true, transactionId: result.transaction.id });
      } else {
        // O pagamento falhou
        res.json({ success: false });
      }
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
