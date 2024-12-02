import Component from './Component.mjs';
import {Button} from './Button.mjs';
import API from './API.mjs';
import Loader from './Loader.mjs';

export default class FBButton extends Component {

    async getAppId() {
        if (this.appId) return this.appId
        const res = await API.get('/bridge/facebook/app-id/')
        this.appId = res.appId
        return res.appId
    }

    async sendCode(code) {
        this.loader.show()
        try {
            await API.put('/bridge/facebook/auth/callback', {code})
            await this.render()
        } catch (e) {console.error(e)}
        this.loader.hide()
    }

    async connectFacebook() {
        const redirectUri = 'http://localhost:3000/facebook-callback'
        const url = 'https://www.facebook.com/v21.0/dialog/oauth'
        const queries = new URLSearchParams({
            response_type: 'token',
            client_id: await this.getAppId(),
            auth_type: 'rerequest',
            redirect_uri: redirectUri,
            scope: [
                'email',
                'publish_video',
                'pages_show_list',
                'ads_management',
                'ads_read',
                'pages_read_engagement',
                'pages_read_user_content',
                'pages_manage_ads',
                'pages_manage_engagement',
                'pages_manage_posts'
            ].join(','),
        }).toString()

        const fbWindow = window.open(`${url}?${queries}`, 'fbWindow', 'width=560,height=700')
        fbWindow.focus();
        const interval = setInterval(async () => {
            try {
                if (fbWindow.closed) clearInterval(interval);
                if (fbWindow.location.href.startsWith(redirectUri)) {
                    clearInterval(interval);
                    const params = Object.fromEntries(new URLSearchParams(fbWindow.location.hash).entries());
                    const code = params['#access_token']
                    fbWindow.close();
                    await this.sendCode(code)
                }
            } catch (error) {
                if (error.name !== 'SecurityError') {
                    console.error(error)
                }
            }
        }, 500);

    }

    async disconnectFacebook() {
        try {
            const answer = confirm('Do you really want to disconnect facebook account ?')
            if (answer) {
                await API.get('/bridge/facebook/auth/logout')
                await this.render()
            }

        } catch (e) {
            console.error(e)
            await this.render()
            window.toast.error('Something went wrong!')
        }
    }

    async getFbUser() {
        try {
            return await API.get('/bridge/facebook/auth/user')
        } catch (e) {return null}
    }

    async render(element) {
        await super.render(element);
        this.loader = await this.draw(Loader, {}, this.element)
        const fbUser = await this.getFbUser()

        if (fbUser != null) {
            await this.draw(Button, {
                icon: 'facebook',
                title:'Disconnect Facebook Account ' + fbUser.name,
                onClick: this.disconnectFacebook.bind(this),
            }, this.element)
        } else {
            await this.draw(Button, {
                icon: 'facebook',
                title:'Connect Facebook',
                onClick: this.connectFacebook.bind(this),
            }, this.element)
        }
    }
}