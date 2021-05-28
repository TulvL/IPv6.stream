# IPv6 测速节点搭建教程（多线服务器版）

本教程适用于一主机多 IP 多站点的场景  

相比传统场景，本教程主要扩充的内容是：
1. 记录同一主机多 IPv6 地址的配置方法  
2. 解释同一域名配置多个不同前缀 IPv6 地址后，浏览器会自动匹配最接近的地址的特性  
3. 记录同一主机为不同地址绑定不同网站的方法  

若非上述情况，可前往传统 [Nginx](../nginx)、[Apache](../apache) 教程  

如使用 Docker 可能需要更高配置，本教程暂不涉及  

## VPS 准备  


最低硬件要求：  
128MB RAM、1 GB 剩余空间、服务商提供多个 IPv6 地址（段）  
  
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
以下是本文示例用的域名和地址，操作时请记得替换：  
  
示例综合域名  example.ipv6.stream  
示例域名1    1.example.ipv6.stream  
示例IP地址1  2001:db8::8/80  
示例域名2    2.example.ipv6.stream  
示例IP地址2  2001:db9::9/80  
示例域名3    3.example.ipv6.stream  
示例IP地址3  2001:dba::a/80  
  
如果是自己持有域名，在 DNS 提供商处给 example.ipv6.stream 添加三条 AAAA 记录，并分别给三个域名添加对应的 AAAA 记录  

当浏览器获得 example.ipv6.stream 的三个解析结果后，通常会根据客户端主机的 IPv6 地址进行最长前缀匹配  

例如客户端的 IPv6 地址为 2001:db9:1000::1c34 ，则会优先连接 2001:db9::9

如果有多个等长的前缀匹配，则行为与 IPv4 基本一致

如果想使用本站域名，但还未解析，可先在本地计算机的 hosts 增加记录用于后续配置：  
```
2001:db8::8 example.ipv6.stream
2001:db9::9 example.ipv6.stream
2001:dba::a example.ipv6.stream
2001:db8::8 1.example.ipv6.stream
2001:db9::9 2.example.ipv6.stream
2001:dba::a 3.example.ipv6.stream
```
提出申请、解析完成后建议删除此记录  


### 配置多个 IPv6  

有的服务商会自动配置完成，可输入以下命令查看  

```
ip addr
```

有的服务商需手动修改 /etc/network/interfaces （或位于 interfaces.d 内）   

以下是一个例子：  
```
auto eth0
iface eth0 inet6 static
    address 2001:db8::8/80
    gateway 2001:db8::1
    up ip -6 addr add dev eth0 2001:db9::9
    up ip -6 addr add dev eth0 2001:dba::a
```

该部分的配置方法随服务商的不同可能有明显差异，建议查询服务商的文档或咨询客服确认  

重启以生效配置  

如配置错误会导致 SSH 连不上，还请留意  


## HTTP 配置  

安装教程所需的软件

```
apt update  
apt install php libapache2-mod-php unzip curl vim
```


### speedtest-x
下载 speedtest-x 代码并解压缩  

为了给三个 IP 分别建立三个不同的测速站，建立三个文件夹

```
cd /var/www/
wget https://github.com/BadApple9/speedtest-x/archive/refs/heads/master.zip
unzip master.zip
cp speedtest-x-master speedtest-1
cp speedtest-x-master speedtest-2
cp speedtest-x-master speedtest-3
rm -r speedtest-x-master
rm master.zip
```

授予 Apache（www-data）测速记录所在目录的读写权限  
```
chown www-data:www-data  /var/www/speedtest-1/backend/
chown www-data:www-data  /var/www/speedtest-2/backend/
chown www-data:www-data  /var/www/speedtest-3/backend/
```


### 个性化

  
建议对三个站点的 /var/www/speedtest-序号/index.html 分别做修改，以便进行区分 

本站的配置文件 /var/www/speedtest-序号/backend/config.php 如下：

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
<VirtualHost [2001:db8::8]:80>
    DocumentRoot /var/www/speedtest-1/
    ServerName 1.example.ipv6.stream
    ServerAlias example.ipv6.stream
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>

<VirtualHost [2001:db9::9]:80>
    DocumentRoot /var/www/speedtest-2/
    ServerName 2.example.ipv6.stream
    ServerAlias example.ipv6.stream
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>

<VirtualHost [2001:dba::a]:80>
    DocumentRoot /var/www/speedtest-3/
    ServerName 3.example.ipv6.stream
    ServerAlias example.ipv6.stream
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

如无报错，打开域名 http://example.ipv6.stream 、http://1.example.ipv6.stream 、 http://2.example.ipv6.stream、 http://3.example.ipv6.stream 应能显示出测速页面  
检查上下行测速、记录是否正常工作  

至此 HTTP 部分已经配置完成。  

## HTTPS 配置
该部分需要域名已经完成解析  


### acme.sh 

使用前可先参考[官方文档](https://github.com/acmesh-official/acme.sh)   

获取并安装  
```
curl  https://get.acme.sh | sh
```

退出并重新登陆终端  
  
  
为方便使用，给四个域名签出合订版证书  
```
acme.sh --issue  -d example.ipv6.stream  -d 1.example.ipv6.stream  -d 2.example.ipv6.stream  -d 3.example.ipv6.stream  --apache
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
<VirtualHost [2001:db8::8]:443>
    DocumentRoot /var/www/speedtest-1/
    ServerName 1.example.ipv6.stream
    ServerAlias example.ipv6.stream
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
    SSLEngine on
    SSLCertificateFile /var/ssl/cert.pem
    SSLCertificateKeyFile /var/ssl/key.pem
    SSLCertificateChainFile /var/ssl/fullchain.pem
</VirtualHost>

<VirtualHost [2001:db9::9]:443>
    DocumentRoot /var/www/speedtest-2/
    ServerName 2.example.ipv6.stream
    ServerAlias example.ipv6.stream
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
    SSLEngine on
    SSLCertificateFile /var/ssl/cert.pem
    SSLCertificateKeyFile /var/ssl/key.pem
    SSLCertificateChainFile /var/ssl/fullchain.pem
</VirtualHost>

<VirtualHost [2001:dba::a]:443>
    DocumentRoot /var/www/speedtest-3/
    ServerName 3.example.ipv6.stream
    ServerAlias example.ipv6.stream
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

如无报错，打开域名 https://example.ipv6.stream 、https://1.example.ipv6.stream 、 https://2.example.ipv6.stream、 https://3.example.ipv6.stream 应能显示出测速页面  

至此 HTTPS 部分已经配置完成。  

## 配置完成后

可提交 [Issue](https://github.com/TulvL/IPv6.stream/issues/new?assignees=&labels=&template=------.md&title=%E6%96%B0%E7%AB%99%E7%82%B9%E6%8F%90%E4%BA%A4) 加入 [IPv6.stream](https://IPv6.stream) 列表。   