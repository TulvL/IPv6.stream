# IPv6 测速节点搭建教程（Nginx 版）

本教程使用 Nginx 作为网络服务器，Apache 版见 [这里](../apache)  

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
apt install php php-fpm unzip vim curl
```

如果机器已经装有 apache2 可能会引发冲突，可予以关闭  

```
systemctl stop apache2
systemctl disable apache2
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

授予 Nginx（www-data）测速记录所在目录的读写权限  
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
   
### Nginx
新建文件 /etc/nginx/sites-available/speedtest   

写入：
```
server {
    listen [::]:80;
    server_name example.ipv6.stream;
    root /var/www/speedtest/;

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php7.4-fpm.sock;
    }
}
```
   
启用网站  
```
ln -s /etc/nginx/sites-available/speedtest /etc/nginx/sites-enabled/
```

如果希望记录的时间与北京时间保持一致，可在 /etc/php/7.4/fpm/php.ini 中配置时区：
```
date.timezone = "PRC"
```
（大约位于第 956 行，去掉注释）

重启 Nginx  
```
systemctl restart nginx
```

如无报错，打开域名 http://example.ipv6.stream 应能显示出测速页面  
检查上下行测速、记录是否正常工作  

至此 HTTP 部分已经配置完成。  

## HTTPS 配置
该部分需要域名已经完成解析  

本教程使用 certbot 申请，acme.sh 可参考 [Apache 教程](../apache#acmesh)   

### certbot 
使用前可先参考[官方网站](https://certbot.eff.org/lets-encrypt/debianbuster-nginx)   

逐条输入以下命令完成安装  
```
apt install snapd
snap install core
snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot

```
  
  
  
签署证书  
```
certbot --nginx  
```  

按照提示选择域名、提供信息，即可自动签发证书并修改 nginx 配置   

certbot 默认会给 80 配置指向 443 的跳转  
如不需要，可以把 /etc/nginx/sites-available/speedtest 中监听 80 的部分恢复原状  
并重启 nginx  
```
systemctl restart nginx
```

此时打开域名 https://example.ipv6.stream 应能显示出测速页面  

至此 HTTPS 部分已经配置完成。  

## 配置完成后

可提交 [Issue](https://github.com/TulvL/IPv6.stream/issues/new?assignees=&labels=&template=------.md&title=%E6%96%B0%E7%AB%99%E7%82%B9%E6%8F%90%E4%BA%A4) 加入 [IPv6.stream](https://IPv6.stream) 列表。     