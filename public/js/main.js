const socket = new WebSocket(`wss://${ window.location.hostname }:${ window.location.port }`)
fetchMessage()

socket.onmessage = ({ data }) => {
  try {
    const received = JSON.parse(data)
    // messages
    if (received.new_message) {
      fetchMessage()
    }
  } catch (error) {
    console.log(data)
  }
}

$('#send-message').click(() => {
  $.ajax({
    url: '/chat',
    method: 'POST',
    data: {
      message: $('#your-message').val()
    },
    success: result => {
      $('#your-message').val('')
      if (result.success) {
        socket.send(
          JSON.stringify({
            new_message: true
          })
        )
        fetchMessage()
      }
    }
  })
})

function fetchMessage() {
  $.ajax({
    url: '/messages',
    method: 'GET',
    success: result => {
      $('.message-bubble').html('')
      for (var i = 0; i < result.length; i++) {
        if (result[i].facebookId == facebookId) {
          $('.message-bubble').append(`\
            <span style="text-align: right">${ result[i].message }</span>\
          `)
        } else {
          $('.message-bubble').append(`\
            <span>${ result[i].message }</span>\
          `)
        }
      }
      $('.message-bubble').scrollTop($('.message-bubble')[0].scrollHeight)
    }
  })
}
