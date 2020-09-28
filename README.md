# property-management-api

sudo apt-get install mariadb-server
mysql -u root
create database PM;

CREATE USER 'jjuser'@'localhost' IDENTIFIED BY '12345';
CREATE USER 'jjuser'@'%' IDENTIFIED BY '12345';
GRANT ALL PRIVILEGES ON PM.* TO 'jjuser'@'%';
GRANT ALL PRIVILEGES ON PM.* TO 'jjuser'@'localhost';
FLUSH PRIVILEGES;


CREATE USER 'lluser'@'localhost' IDENTIFIED BY '12345';
GRANT ALL PRIVILEGES ON PM.* TO 'lluser'@'localhost';
FLUSH PRIVILEGES;