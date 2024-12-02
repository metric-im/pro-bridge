import Component from './Component.mjs';
import {Button} from './Button.mjs';
import API from './API.mjs';
import Loader from './Loader.mjs';

export default class TWButton extends Component {

    // sending access token credentials
    async sendTwitterCredentials(credentials) {
        this.loader.show()
        const res = await API.put('/bridge/twitter/auth/callback', credentials)
        this.loader.hide()
        if (res) {
            await this.render()
        }

    }

    async getTwUser() {
        try {
            return await API.get('/bridge/twitter/auth/user')
        } catch (e) {return null}
    }

    async connectTwitter() {
        this.loader.show()
        const res = await API.get('/bridge/twitter/auth/session')
        this.loader.hide()
        const twWindow = window.open(res.url, 'fbWindow', 'width=560,height=700')
        const redirectUri = 'http://localhost:3000/twitter-callback'
        twWindow.focus();
        const interval = setInterval(async () => {
            try {
                if (twWindow.closed) clearInterval(interval);
                if (twWindow.location.href.startsWith(redirectUri)) {
                    clearInterval(interval);
                    const params = Object.fromEntries(new URLSearchParams(twWindow.location.search).entries());
                    const {oauth_token, oauth_verifier} = params
                    twWindow.close();
                    await this.sendTwitterCredentials({oauth_token, oauth_verifier})
                }
            } catch (error) {
                if (error.name !== 'SecurityError') {
                    console.error(error)
                }
            }
        }, 500);
    }

    async disconnectTwitter() {
        try {
            const answer = confirm('Do you really want to disconnect x/twitter account ?')
            if (answer) {
                await API.get('/bridge/twitter/auth/logout')
                await this.render()
            }

        } catch (e) {
            console.error(e)
            await this.render()
            window.toast.error('Something went wrong!')
        }
    }

    async render(element) {
        await super.render(element)
        this.loader = await this.draw(Loader, {}, this.element)

        const twUser = await this.getTwUser()

        if (twUser != null) {
            await this.draw(Button, {
                icon: 'twitter',
                title:`Disconnect X/Twitter Account ${twUser.screen_name}`,
                onClick: this.disconnectTwitter.bind(this)
            }, this.element)
        } else {
            await this.draw(Button, {
                icon: 'twitter',
                title:'Connect X/Twitter',
                onClick: this.connectTwitter.bind(this)
            }, this.element)
        }
    }

}