# Hướng dẫn thiết lập Google Workspace Domain cho ABC Dashboard

Hướng dẫn chi tiết để thiết lập domain với Google Workspace và tích hợp vào ABC Dashboard backend.

## 📋 Tổng quan

Google Workspace cung cấp giải pháp email doanh nghiệp với khả năng gửi email chuyên nghiệp từ domain của bạn. Hướng dẫn này sẽ giúp bạn:

- Thiết lập Google Workspace account
- Xác minh sở hữu domain
- Cấu hình DNS records
- Thiết lập email authentication (2FA + App Password)
- Tích hợp với ABC Dashboard

## 🎯 Điều kiện tiên quyết

- Domain name đã đăng ký (ví dụ: `yourcompany.com`)
- Quyền quản trị DNS của domain
- Tài khoản Google Workspace (miễn phí hoặc trả phí)

## 📝 Các bước thiết lập

### Bước 1: Thiết lập Google Workspace Account

#### 1.1 Tạo Google Workspace Account

1. Truy cập [workspace.google.com](https://workspace.google.com)
2. Chọn "Get started" hoặc "Bắt đầu"
3. Chọn gói phù hợp:
   - **Business Starter** (miễn phí): 30GB/người, 100 người
   - **Business Standard**: $12/người/tháng
   - **Business Plus**: $18/người/tháng

#### 1.2 Xác minh số điện thoại và thanh toán

1. Nhập thông tin công ty
2. Xác minh số điện thoại
3. Thiết lập phương thức thanh toán (nếu chọn gói trả phí)

### Bước 2: Xác minh Domain

#### 2.1 Thêm Domain vào Google Workspace

1. Đăng nhập vào [admin.google.com](https://admin.google.com)
2. Chọn **Domains** → **Manage domains**
3. Nhấn **Add a domain**
4. Nhập domain name (ví dụ: `yourcompany.com`)
5. Chọn **Verify domain ownership**

#### 2.2 Xác minh sở hữu Domain

Google cung cấp 4 phương pháp xác minh:

**Phương pháp 1: HTML File Upload (Khuyến nghị)**

1. Tải file HTML từ Google Workspace
2. Upload file này vào thư mục root của website
3. Truy cập `https://yourdomain.com/google[long-string].html`
4. Nhấn **Verify** trong Google Workspace

**Phương pháp 2: DNS TXT Record**

1. Sao chép TXT record từ Google Workspace
2. Thêm record vào DNS settings của domain:

```
Type: TXT
Name: @
Value: google-site-verification=[verification-code]
TTL: 3600
```

**Phương pháp 3: CNAME Record**

```
Type: CNAME
Name: [verification-code].yourdomain.com
Value: gv-[verification-code].googlehosted.com
TTL: 3600
```

**Phương pháp 4: MX Record**

```
Type: MX
Name: @
Value: ASPMX.L.GOOGLE.COM (Priority: 1)
```

### Bước 3: Cấu hình DNS Records

#### 3.1 MX Records (Email Routing)

Thêm MX records để chuyển tiếp email đến Google Workspace:

```
Type: MX
Name: @
Value: ASPMX.L.GOOGLE.COM
Priority: 1

Type: MX
Name: @
Value: ALT1.ASPMX.L.GOOGLE.COM
Priority: 5

Type: MX
Name: @
Value: ALT2.ASPMX.L.GOOGLE.COM
Priority: 5

Type: MX
Name: @
Value: ALT3.ASPMX.L.GOOGLE.COM
Priority: 10

Type: MX
Name: @
Value: ALT4.ASPMX.L.GOOGLE.COM
Priority: 10
```

#### 3.2 SPF Record (Sender Policy Framework)

Thêm SPF record để xác thực email gửi từ domain:

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
TTL: 3600
```

#### 3.3 DKIM Record (DomainKeys Identified Mail)

1. Trong Google Admin Console → **Apps** → **Google Workspace** → **Gmail** → **Authenticate email**
2. Chọn domain và nhấn **Generate new record**
3. Sao chép DKIM record và thêm vào DNS:

```
Type: TXT
Name: google._domainkey
Value: [DKIM-key-provided-by-google]
TTL: 3600
```

#### 3.4 DMARC Record (Domain-based Message Authentication)

Thêm DMARC record để bảo vệ domain khỏi spam:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com
TTL: 3600
```

### Bước 4: Thiết lập Email Authentication

#### 4.1 Bật 2-Factor Authentication (2FA)

1. Đăng nhập [admin.google.com](https://admin.google.com)
2. Chọn **Security** → **Authentication** → **2-step verification**
3. Bật 2FA cho admin account
4. Mở rộng cho tất cả users nếu cần

#### 4.2 Tạo App Password

1. Truy cập [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Đăng nhập với Google Workspace account
3. Chọn **Mail** → **Other (custom name)**
4. Nhập "ABC Dashboard" làm tên ứng dụng
5. Sao chép **16 ký tự password** được tạo

> ⚠️ **Quan trọng**: App Password chỉ hiển thị một lần. Hãy sao chép và lưu trữ an toàn.

### Bước 5: Tích hợp với ABC Dashboard

#### 5.1 Cập nhật file .env

Tạo hoặc cập nhật file `.env` trong thư mục backend:

```bash
# Environment Configuration
NODE_ENV=production

# Database
MONGODB_URI=mongodb://your-production-mongodb-uri

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=abc-dashboard
JWT_EMAIL_VERIFICATION_EXPIRES_IN=24h
JWT_PASSWORD_RESET_EXPIRES_IN=10m

# Client URL
CLIENT_URL=https://your-production-domain.com

# Encryption
BCRYPT_ROUNDS=14

# Email Configuration - Google Workspace
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # Your 16-character App Password
EMAIL_SERVICE=google-workspace

# Cache Configuration
CACHE_USER_DATA_TTL=1800
CACHE_API_RESPONSE_TTL=300
```

#### 5.2 Test Email Configuration

```bash
# Test email configuration
npm run test:email-config

# Start application
npm run dev

# Test email sending (tạo user mới để trigger email)
curl -X POST http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@yourdomain.com",
    "displayName": "Test User",
    "role": "staff"
  }'
```

## 🔧 Troubleshooting

### Lỗi phổ biến và giải pháp

#### 1. "Domain not verified"

**Nguyên nhân**: Domain chưa được xác minh đúng cách
**Giải pháp**:

- Kiểm tra DNS propagation (có thể mất 24-48 giờ)
- Đảm bảo TXT/CNAME record được thêm chính xác
- Sử dụng công cụ kiểm tra DNS: `dig TXT yourdomain.com`

#### 2. "535-5.7.8 Username and Password not accepted"

**Nguyên nhân**: Sai App Password hoặc chưa bật 2FA

**Giải pháp**:

- Tạo lại App Password mới
- Đảm bảo 2FA được bật
- Kiểm tra định dạng password (16 ký tự, không có dấu cách)

#### 3. "Daily sending quota exceeded"

**Nguyên nhân**: Vượt quá giới hạn gửi email
**Giải pháp**:

- **Free tier**: 500 emails/ngày
- **Business Starter**: 2,000 emails/ngày
- **Business Standard**: 5,000 emails/ngày
- **Business Plus**: 5,000 emails/ngày
- **Enterprise**: 10,000+ emails/ngày

#### 4. "TLS connection failed"

**Nguyên nhân**: Vấn đề kết nối SMTP
**Giải pháp**:

- Đảm bảo `EMAIL_SECURE=false` (sử dụng STARTTLS)
- Kiểm tra port 587 không bị block
- Tắt VPN/firewall tạm thời để test

### Công cụ kiểm tra

#### DNS Propagation Check

```bash
# Check MX records
dig MX yourdomain.com

# Check SPF record
dig TXT yourdomain.com


# Check DKIM record
dig TXT google._domainkey.yourdomain.com
```

#### Email Testing Tools

- **Mail-Tester**: Kiểm tra email reputation
- **GlockApps**: Test deliverability
- **SendForensics**: Email authentication check

## 📊 Monitoring & Analytics

### Theo dõi Email Delivery

1. **Google Workspace Admin Console**:
   - Apps → Google Workspace → Gmail → Reports
   - Xem bounce rates, delivery success

2. **Application Logs**:

```bash
tail -f logs/app.log | grep -i email
```

3. **Health Check Endpoint**:

```bash
curl http://your-domain.com/api/v1/health/email
```

### Key Metrics cần theo dõi

- **Delivery Rate**: Tỷ lệ email gửi thành công
- **Bounce Rate**: Tỷ lệ email bị trả lại
- **Open Rate**: Tỷ lệ email được mở (nếu có tracking)
- **Spam Complaints**: Phàn nàn về spam

## 🔒 Security Best Practices

### Email Security

1. **App Passwords**: Sử dụng thay vì regular password
2. **2FA Required**: Luôn bật xác thực 2 yếu tố
3. **Regular Rotation**: Đổi App Password định kỳ
4. **Domain Authentication**: SPF, DKIM, DMARC đầy đủ

### Application Security

1. **Environment Variables**: Không commit credentials vào code
2. **Secret Management**: Sử dụng secret management services
3. **Rate Limiting**: Giới hạn số email gửi từ ứng dụng
4. **Logging**: Ghi log tất cả hoạt động email

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Domain verified và DNS propagated
- [ ] MX records configured
- [ ] SPF/DKIM/DMARC records added
- [ ] 2FA enabled cho admin account
- [ ] App Password generated và stored securely
- [ ] Environment variables configured
- [ ] Email configuration tested locally
- [ ] Production database connected
- [ ] SSL certificate configured

### Deployment Steps

```bash
# Build and deploy
npm run build
npm run start:prod


# Verify email service
curl https://your-domain.com/api/v1/health/email
```

## 📞 Support & Resources

### Google Workspace Support

- **Admin Console**: [admin.google.com](https://admin.google.com)

- **Support Center**: [support.google.com/workspace](https://support.google.com/workspace)
- **Community**: [workspace.google.com/community](https://workspace.google.com/community)

### ABC Dashboard Resources

- **Email Setup Guide**: `email-setup-guide.md`
- **API Documentation**: `/api-docs`
- **Health Checks**: `/api/v1/health`

### Useful Links

- [Google Workspace DNS Setup](https://support.google.com/a/answer/140034)
- [Email Authentication Guide](https://support.google.com/mail/answer/81126)
- [DKIM Setup Instructions](https://support.google.com/a/answer/174124)

---

_Document Version: 1.0 | Last Updated: December 3, 2025_
