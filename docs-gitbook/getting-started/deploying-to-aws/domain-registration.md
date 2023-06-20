# Register a domain

## Purchase a domain

You can buy domains many places, but there is some convenience to doing it through AWS itself, which is reasonably priced:

![](../../.gitbook/assets/DomainPurchase.png)

Cheaper domains on AWS currently cost around $12/yr, but if you would like a trendier domain, you can expect to pay more. Students may be able to get a free domain through [NameCheap for Education](https://nc.me/).

## Set up an SSL certificate

In order to have encryption&mdash;which you want!&mdash;you need a certificate. You can get this for free through AWS, though it's particularly easy to set this up if you registered your domain through AWS as well:

1. First, make sure you are in the US-East-1 zone. \([This matters](https://medium.com/dailyjs/a-guide-to-deploying-your-react-app-with-aws-s3-including-https-a-custom-domain-a-cdn-and-58245251f081).\)
2. In the AWS Certificate Manager, select "Provision Certificate"
3. Request a public certificate.
4. Enter two your domain preceded by an `*` \(thus 'gameswithwords.org' would be entered as `*.gameswithwords.org`\).
5. If you registered your domain with AWS, use DNS validation. Otherwise, follow the instructions.
6. IF you used AWS for your domain registration, Skip through the next couple steps and click "request". If you did not, it may be more complicated. ![](../.gitbook/SSL.mov)
7. IF you used AWS for your domain registration, select the certficate from the list of certificates. Scroll down to "Domains" and click "Create records in Route 53". Select the domain from the list.

At this point, you wait for your certificate to be issued. Depending on how you registered your domain, this may take variable amounts of time. For us, it usually only takes a few minutes.

SSL certificates set up outside of AWS [vary in cost](https://qr.ae/pNsljr), but start around $8/year.

