# xmm-granular-simple

## simple example of a gesture follower controling a granular sample player.

This project uses Node.js, the Wavesjs library and the XMM library to provide a
minimal example that plays a sounds granularly, in sync with the estimated
time progression of a gesture.

## Instructions for use :

- Open terminal, go to this folder and type `npm install` to install all the
dependencies.
- Then type `npm run start` to start the server.
- Open your mobile's browser and go to `my.server.ip.address:8000`.
- Click on the "REC" button to start recording a gesture, then click again to
stop recording.
- Click on the "SEND" button to send the latest recorded gesture to the server.
- Click on the play button (the square one with an arrow pointing to the right).
This will enable the granular player which will start following the gesture you
just recorded, each time you redo it.
- You can try different sounds by selecting them from the menu next to the play
button.