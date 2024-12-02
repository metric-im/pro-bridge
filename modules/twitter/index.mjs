import OAuth from 'oauth-1.0a'
import express from "express";
import axios from "axios";
import crypto from 'crypto'

export default class Twitter {
    constructor(connector) {
        this.collection = connector.db.collection('twitter_account')
        this.connector = connector
        this.root = 'https://api.x.com'

        this.appName = '1858472790300430336orozdev'
        this.appId = '29633637'
        this.consumerKey = 'P7fQpVPC2qu41NlvxBWqTsDow'
        this.consumerSecret = 'jpv3hgJr4GW20vvAOhGrxzSTdis5tDGh7j2HUr91SleInFO1hQ'
        this.clientId = 'NlVOQzlndmh0anprZFRRcXdwOXc6MTpjaQ'
        this.clientSecret = 'GBieRvWLaAEenWIpdfrv3xvSGaQxY3ZFbQRqi4_uebK48hqrAl'

        this.twitterApi = axios.create({
            baseURL: this.root,
            timeout: 2000
        });

        this.oauth = OAuth({
            consumer: {key: this.consumerKey, secret: this.consumerSecret},
            signature_method: 'HMAC-SHA1',
            hash_function(baseString, key) {
                return crypto.createHmac('sha1', key).update(baseString).digest('base64');
            },
        });

    }

    routes() {
        const router = express.Router();

        router.get('/auth/session', async (req, res) => {
            try {
                if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})

                const requestTokenURL = this.root + '/oauth/request_token';
                const authHeader = this.oauth.toHeader(this.oauth.authorize({
                    url: requestTokenURL,
                    method: 'POST'
                }));

                const oAuthRequestTokenRes = await this.twitterApi(requestTokenURL.slice(this.root.length, requestTokenURL.length), {
                    method: 'POST',
                    headers: {
                        Authorization: authHeader['Authorization']
                    }
                })

                if (oAuthRequestTokenRes.status !== 200) return res.status(oAuthRequestTokenRes.status).json(oAuthRequestTokenRes.data)

                const oAuthRequestToken = Object.fromEntries(new URLSearchParams(oAuthRequestTokenRes.data));
                const authorizeURL = this.root + `/oauth/authorize?oauth_token=${oAuthRequestToken.oauth_token}`;

                return res.status(200).json({url: authorizeURL})
            } catch (error) {
                console.error('Error:', error);
                return res.json(500).json()
            }
        })

        router.put('/auth/callback', async (req, res) => {
            try {
                if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})
                const { oauth_token, oauth_verifier } = req.body
                if (oauth_token === undefined || oauth_verifier === undefined) {
                    return res.status(400).json({message: 'Enter oauth_token and oauth_verifier credentials please'})
                }

                const requestData = {
                    url: this.root + 'oauth/access_token',
                    method: 'POST',
                    data: { oauth_token, oauth_verifier },
                };

                const accessTokenRes = await this.twitterApi.post('/oauth/access_token', {}, {
                    headers: this.oauth.toHeader(this.oauth.authorize(requestData))
                })
                const data = {
                    ...Object.fromEntries(new URLSearchParams(accessTokenRes.data).entries()),
                    _id: req.account.userId
                }
                await this.collection.insertOne(data)
                return res.status(200).json({message: 'success'})
            } catch (error) {
                console.error('Error:', error);
                return res.json(500).json()
            }
        })

        router.get('/auth/user', async (req, res) => {
            if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})
            const twUser = await this.collection.findOne({_id: req.account.userId})
            return res.status(twUser != null ? 200 : 404).json(twUser)
        })

        router.get('/auth/logout', async (req, res) => {
            if (!req.account) return res.status(401).json({message: 'The user must be authenticated'})
            await this.collection.deleteOne({_id: req.account.userId})
            return res.status(200).json({message: 'success'})
        })

        return router
    }

}