// Replace 'YOUR_PAYPAL_CLIENT_ID' with your PayPal sandbox client ID
paypal.Buttons({
    createOrder: function(data, actions) {
      // Replace '10.00' with the actual product price
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: '10.00',
          },
        }],
        // Add the buyer information from the form
        payer: {
          name: {
            given_name: document.getElementById('firstName').value,
            surname: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            addressLine1: document.getElementById('addressLine1').value,
            addressLine2: document.getElementById('addressLine2').value,
            state: document.getElementById('state').value,
            zip: document.getElementById('zip').value,
            country_code: document.getElementById('country').value,
            // Add other buyer information here
          },
        },
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        // Redirect to the thank you page with transaction ID
        window.location.href = '/thank-you?transaction_id=' + details.id;
      });
    }
  }).render('#paypal-buttons');
  