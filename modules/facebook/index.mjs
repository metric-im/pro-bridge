import axios from 'axios';
import express from 'express';

export default class Facebook {
    constructor(connector) {
        this.collection = connector.db.collection('facebook_account')
        this.connector = connector
        this.appId = '1110948920759254' // Soon I'll shift them
        this.appSecret = '406400a4a957efddc8de07f47f13c81e' // Soon I'll shift them
        this.root = 'https://graph.facebook.com/v21.0';
        this.graphApi = axios.create({
            baseURL: this.root,
            timeout: 2000
        });
    }

    routes() {
        let router = express.Router();

        router.get('/app-id',(req, res) => {
            res.status(200).json({appId: this.appId})
        })

        router.get('/auth/user', async (req, res) => {
            if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})

            const fbUser = await this.collection.findOne({_id: req.account.userId})
            return res.status(fbUser != null ? 200 : 404).json(fbUser)
        })

        router.get('/auth/logout', async (req, res) => {
            if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})
            await this.collection.deleteOne({_id: req.account.userId})
            return res.status(200).json({message: 'success'})

        })

        router.put('/auth/callback', async (req, res) => {
            if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})

            const code = req.body['code']
            if (!code) res.status(400).json({message: 'The query param code is required'})

            const userTokenParams = {
                fb_exchange_token: code,
                client_id: this.appId,
                grant_type: 'fb_exchange_token',
                client_secret: this.appSecret
            }
            const userTokenRes = await this.graphApi.get(`oauth/access_token`, {params: userTokenParams})

            if (userTokenRes.status !== 200) return res.status(userTokenRes.status).json(userTokenRes.data)

            const userToken  = userTokenRes.data

            const userRes = await this.graphApi.get('me', {params: {
                access_token: userToken.access_token,
                fields: 'id,email,name',
            }})

            if (userRes.status !== 200) return res.status(userRes.status).json(userRes.data)

            const user = userRes.data

            const adAccountsRes = await this.graphApi.get('me/adaccounts', {params: {
                    access_token: userToken.access_token,
            }})

            if (adAccountsRes.status !== 200) return res.status(adAccountsRes.status).json(adAccountsRes.data)

            const adAccounts = adAccountsRes.data

            const fbUserId = user.id

            delete user.id

            const data = {
                ...user,
                ...userToken,
                ad_accounts: adAccounts,
                fb_user_id: fbUserId,
                _id: req.account.userId
            }

            await this.collection.insertOne(data)

            return res.status(200).json({message: 'success'})
        })

        router.get('/graph-api/:endpoint', async (req, res) => {
            try {
                const response = await this.graphApi.get(req.params.endpoint, {params: req.query || {}})
                res.status(response.status).json(response.data);
            } catch (e) {
                res.status(e.status || e.error ? e.error.statusCode : 500).send({error: e})
            }
        });

        router.post('/graph-api/:endpoint', async (req, res) => {
            try {
                const response = await this.graphApi.post(req.params.endpoint, req.body, {params: req.query || {}})
                res.status(response.status).json(response.data);
            } catch (e) {
                res.status(e.status || e.error ? e.error.statusCode : 500).send({error: e})
            }
        });

        router.put('/graph-api/:endpoint', async (req, res) => {
            try {
                const response = await this.graphApi.put(req.params.endpoint, req.body, {params: req.query || {}})
                res.status(response.status).json(response.data);
            } catch (e) {
                res.status(e.status || e.error ? e.error.statusCode : 500).send({error: e})
            }
        });

        router.patch('/graph-api/:endpoint', async (req, res) => {
            try {
                const response = await this.graphApi.patch(req.params.endpoint, req.body, {params: req.query || {}})
                res.status(response.status).json(response.data);
            } catch (e) {
                res.status(e.status || e.error ? e.error.statusCode : 500).send({error: e})
            }
        });

        router.delete('/graph-api/:endpoint', async (req, res) => {
            try {
                const response = await this.graphApi.delete(req.params.endpoint, {params: req.query || {}})
                res.status(response.status).json(response.data);
            } catch (e) {
                res.status(e.status || e.error ? e.error.statusCode : 500).send({error: e})
            }
        });


        return router;
    }


}
