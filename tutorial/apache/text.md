# IPv6 测速节点搭建教程（Apache 版）

本教程使用 Apache 作为网络服务器，Nginx 版见 [这里](../nginx)   
  
如使用 Docker 可能需要更高配置，本教程暂不涉及  

## VPS 准备  
 

最低硬件要求：  
128MB RAM、1 GB 剩余空间、IPv6 支持 
  
操作系统以 Debian 10 为例   
  

## 网络准备  

部分服务商可能配置有系统或者服务商级防火墙，应使其允许 80、443 入站  

由于存在 OpenVZ 机型，为保证测速结果的可比性，本站测速点默认不开启 BBR

### 测试 IPv4 连通性  
在 VPS 上执行：  
```
ping -4 ip.sb
```
带 IPv4 的机型通常可以连通（含 NAT）  
仅 IPv6 的机型通常不通  
  
如果不通，不支持 IPv6 的在线安装可能会出现问题，可配置 DNS64 解决：  
```
echo -e "nameserver 2001:67c:2b0::4\nnameserver 2001:67c:2b0::6\nnameserver 127.0.0.1" > /etc/resolv.conf
```
此命令会覆盖原有的配置  

### 测试 IPv6 连通性  
在 VPS 上执行：
```
ping -6 ip.sb
```  
应当可以连通，否则会影响测速程序正常运行  

个别服务商的 DHCPv6 配置存在问题，会获得意外的 IPv6 地址，导致服务器无法出站  
如遇到此情况，设网卡为 eth0，则可在 /etc/sysctl.conf 中增加：  
```
net.ipv6.conf.eth0.autoconf=0
net.ipv6.conf.eth0.accept_ra=0
net.ipv6.conf.eth0.use_tempaddr=0
```
从而禁止意外的自动地址配置  

### 域名  
以下是本文示例使用的域名和地址，操作时请记得替换：  
  
示例域名    example.ipv6.stream  
示例IP地址  2001:db8::1  
  
如果是自己持有域名，在 DNS 提供商处设置 example.ipv6.stream 的 AAAA 记录为 2001:db8::1  

如果想使用本站域名，但还未解析，可先在本地计算机的 hosts 增加一条记录用于后续配置：  
```
2001:db8::1 example.ipv6.stream
```
解析完成后建议删除此记录  


## HTTP 配置  

安装教程所需的软件

```
apt update  
apt install php libapache2-mod-php unzip curl vim
```


### speedtest-x
下载 speedtest-x 代码并解压缩

```
cd /var/www/
wget https://github.com/BadApple9/speedtest-x/archive/refs/heads/master.zip
unzip master.zip
mv speedtest-x-master speedtest
rm master.zip
```

授予 Apache（www-data）测速记录所在目录的读写权限  
```
chown www-data:www-data  /var/www/speedtest/backend/
```


### 个性化


本站的配置文件 /var/www/speedtest/backend/config.php 如下：

```
<?php

/**
 * 最多保存多少条测试记录
 */
const MAX_LOG_COUNT = 150;

/**
 * IP运营商解析服务：(1) ip.sb | (2) ipinfo.io （如果1解析ip异常，请切换成2）
 */
const IP_SERVICE = 'ip.sb';

/**
 * 是否允许同一IP记录多条测速结果
 */
const SAME_IP_MULTI_LOGS = true;
```
   
### Apache
新建文件 /etc/apache2/sites-available/speedtest.conf
写入：
```
<VirtualHost *:80>
    ServerName example.ipv6.stream
    DocumentRoot /var/www/speedtest
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```
   
启用网站  
```
a2ensite speedtest.conf
```

如果希望记录的时间与北京时间保持一致，可在 /etc/php/7.3/apache2/php.ini 中配置时区：
```
date.timezone = "PRC"
```
（大约位于第 956 行，去掉注释）

重启 apache  
```
systemctl restart apache2
```

如无报错，打开域名 http://example.ipv6.stream 应能显示出测速页面  
检查上下行测速、记录是否正常工作  

至此 HTTP 部分已经配置完成。  

## HTTPS 配置
该部分需要域名已经完成解析  

本教程使用 acme.sh 申请，cerbot 可参考 [Nginx 教程](../nginx#certbot)   

### acme.sh 

使用前可先参考[官方文档](https://github.com/acmesh-official/acme.sh)   

获取并安装  
```
curl  https://get.acme.sh | sh
```

退出并重新登陆终端  
  
  
签署证书  
```
acme.sh --issue  -d example.ipv6.stream   --apache
```  

新建证书目录并安装
```
mkdir /var/ssl/
acme.sh --install-cert -d example.ipv6.stream \
--cert-file      /var/ssl/cert.pem  \
--key-file      /var/ssl/key.pem  \
--fullchain-file /var/ssl/fullchain.pem \
--reloadcmd     "service apache2 force-reload"
```

### Apache
启用 SSL  
```
a2enmod ssl
```
  
新建文件 /etc/apache2/sites-available/speedtest-ssl.conf   

写入：  
```
<VirtualHost *:443>
    ServerName example.ipv6.stream
    DocumentRoot /var/www/speedtest
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
    SSLEngine on
    SSLCertificateFile /var/ssl/cert.pem
    SSLCertificateKeyFile /var/ssl/key.pem
    SSLCertificateChainFile /var/ssl/fullchain.pem
</VirtualHost>
```

启用新配置  
```
a2ensite speedtest-ssl.conf
```


重启 apache  
```
systemctl restart apache2
```

如无报错，打开域名 https://example.ipv6.stream 应能显示出测速页面  

至此 HTTPS 部分已经配置完成。  

## 配置完成后

可提交 [Issue](https://github.com/TulvL/IPv6.stream/issues/new?assignees=&labels=&template=------.md&title=%E6%96%B0%E7%AB%99%E7%82%B9%E6%8F%90%E4%BA%A4) 加入 [IPv6.stream](https://IPv6.stream) 列表。   