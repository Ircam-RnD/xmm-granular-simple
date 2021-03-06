# xmm-granular-simple

### simple example of a gesture follower controling a granular sample player

This project uses Node.js, the Wavesjs library and the XMM library to provide a
minimal example that plays a sounds granularly, in sync with the estimated
time progression of a gesture.

## Instructions :

### Installation

- Install Node.js version 0.12 or higher.
- Open terminal, go to this folder and type `npm install` to install all the
dependencies.

### Use

- From the terminal, type `npm run start` from the same folder to start the
server.
- Open your mobile's browser and go to `my.server.ip.address:8000`.
- Click on the "REC" button to start recording a gesture, then click again to
stop recording.
- Click on the "SEND" button to send the latest recorded gesture to the server.
This will trig the training of a HMM model that will be sent back automatically
to the client.
- Click on the play button (the square one with an arrow pointing to the right).
This will enable the granular player which will start following the gesture you
trained the model with.

## Notes :

- You can try different sounds by selecting them from the menu next to the play
button.
- You can repeat the record / send operation as many times as you want, but 
the system will assume you always send the same gesture. This might improve the
model, which will be updated each time you send a new recording.
- If you want to try another gesture, either click on the "RESET" button, or
reload the page, then you can start recording / sending a new gesture.
- In addition to the position control of the granular player from the estimated
time progression of the gesture, the energy of the gesture controls the volume
of the sound.