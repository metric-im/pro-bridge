import Component from './Component.mjs';
import {Button} from './Button.mjs';
import API from './API.mjs';

export default class FBButton extends Component {

    prepareLoader() {
        this.loader = this.div('loader', this.content)
        const loaderImage = document.createElement('img')
        loaderImage.src = '/assets/loader.gif'
        loaderImage.style.width = '2rem'
        this.loader.append(loaderImage)
        this.loader.setAttribute('style', 'z-index:99;opacity:.5;background-color:var(--action-color-hilite);position:fixed;display:none;align-items:center;justify-content:center;top:0;bottom:0;right:0;left:0;')
    }

    startLoading() {
        const loader = document.querySelector('.loader')
        loader.style.display = 'flex'
    }

    stopLoading() {
        const loader = document.querySelector('.loader')
        loader.style.display = 'none'
    }


    async getAppId() {
        if (this.appId) return this.appId
        const res = await API.get('/bridge/facebook/app-id/')
        this.appId = res.appId
        return res.appId
    }

    async sendCode(code) {
        this.startLoading()
        try {
            const res = await API.put('/bridge/facebook/auth/callback', {code})

        } catch (e) {console.error(e)}
        this.stopLoading()
        await this.render()
    }

    async handleClick() {
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

    async getFbUser() {
        try {
            return await API.get('/bridge/facebook/auth/user')
        } catch (e) {return null}
    }

    async render(element) {
        await super.render(element);
        this.prepareLoader()

        const fbUser = await this.getFbUser()

        await this.draw(Button, {
            icon: 'facebook',
            title: fbUser != undefined ? `Connected the account ${fbUser.name}` :  'Connect Facebook',
            onClick: this.handleClick.bind(this),
            disabled: fbUser != null,
        }, this.element)
    }
}