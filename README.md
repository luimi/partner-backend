# Partner

## Instalation

```bash
cd  partner-backend
npm  i
```

## Configure

.env file

```enviroment
PORT=4000
PARSE_MONGODB_URI="mongodb+srv://user:password@main.abc123.mongodb.net/Main?retryWrites=true&w=majority&appName=Main"
PARSE_APPID="abcedfghijklmnopqrstuvwxyz"
PARSE_MASTERKEY="abcedfghijklmnopqrstuvwxyz"
PARSE_RESTKEY="abcedfghijklmnopqrstuvwxyz"
PARSE_SERVER_URL="http://localhost:4000/parse"
CLOUDINARY_NAME="abcdefg"
CLOUDINARY_APIKEY="1234567890"
CLOUDINARY_APISECRET="abcdefghi123456789"
GOOGLE_CLIENTID="1234567890-abcdefghijklmo1234567890.apps.googleusercontent.com"
EMAIL_HOST="mail.domain.com"
EMAIL_PORT="465"
EMAIL_EMAIL="user@domain.com"
EMAIL_PASSWORD="abcdefg1234567"
PAYMENT_METHOD="wompiSandbox";
PAYMENT_APPID="abcdefghi";
PAYMENT_URL="https://payment.domain.com"
```

## Run

```bash
npm  run  start
```

## Dashboard

```bash
npm  run  dashboard
```

## Config variables
```json
amounts Array [0,1000]
apps Array [{"name":"name","users":"21K","category":"Travel"}]
packs Array [{"name":"name Pack","price":20000,"tokens":5000,"popular":false,"description":"description"}]
```

## Role

Insert new role "Admin"

## User

> CLP - Authenticated: Read

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| emailStatistics | Boolean || true| true|
| emailLowBalance| Boolean| |true|true|
| account| Pointer|Account ||false|

## Classes

### Account

> CLP - Authenticated: Read

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| balance | Number || | true|
| user| Pointer| _User||true|

### Application

> CLP - Authenticated: Read, Role:Admin: Read, Write

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| name | String || | true|
| code | String || | true|
| deleted| Boolean| |false|true|

### Campaign

> CLP - Authenticated: Read, Write

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| name | String || | true|
| description | String || | false|
| url| String| ||false|
|image|String|||true|
|views|Number||0|true|
|clicks|Number||0|true|
|status|String||Pending Review|true|
|active|Boolean||false|true|
|deleted|Boolean||false|true|
|user|Pointer|_User||true|
|apps|Relation|Application||false|
|appsNames|Array|||true|

### Click

> CLP - Authenticated: Read

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| campaign | Pointer |Campaign| | true|

### Coupon

> CLP - Authenticated: Read, Role:Admin: Read, Write

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| tokens | Number ||0| true|
| reedimed | Boolean || false| true|
| user| Pointer| _User||false|

### FAQ

> CLP - Public: Read, Role:Admin: Read, Write

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| question | String ||| true|
| answer | String || | true|

### PaymentUpdate

> CLP - MasterKeyOnly

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| data | Object ||| true|

### Receipt

> CLP - Authenticated: Read

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| title | String ||| true|
| price | Number ||| true|
| tokens | Number ||| true|
| updates | Relation |PaymentUpdate|| false|
| status | String ||| true|
| code | String ||| false|
| account | Pointer |Account|| true|

### View

> CLP - Authenticated: Read

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| app | Pointer |Application|| true|
| campaign | Pointer |Campaign|| true|
| user | String ||| true|